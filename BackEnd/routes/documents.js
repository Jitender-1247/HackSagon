const router = require("express").Router({ mergeParams: true });
const { collections } = require("../config/firebase");
const { authenticate, requireWorkspaceMember } = require("../middleware/middleware");

// All document routes require authentication
router.use(authenticate);

// ─── Documents ────────────────────────────────────────────────────────────────

// GET /api/workspaces/:wid/docs — list documents in workspace
router.get("/workspaces/:wid/docs", requireWorkspaceMember(), async (req, res) => {
  const snap = await collections.documents
    .where("workspaceId", "==", req.params.wid)
    .where("isDeleted", "==", false)
    .orderBy("updatedAt", "desc")
    .get();

  const docs = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const creatorDoc = await collections.users.doc(data.createdById).get();
      const creator = creatorDoc.exists ? creatorDoc.data() : {};
      return {
        id: doc.id,
        title: data.title,
        type: data.type,
        language: data.language,
        updatedAt: data.updatedAt,
        createdBy: { id: data.createdById, name: creator.name || "Unknown" },
      };
    })
  );

  res.json({ docs });
});

// POST /api/workspaces/:wid/docs — create document
router.post("/workspaces/:wid/docs", requireWorkspaceMember("editor"), async (req, res) => {
  const { title, type = "document", language } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const now = new Date().toISOString();
  const docRef = collections.documents.doc();
  await docRef.set({
    title,
    type,
    language: language || null,
    workspaceId: req.params.wid,
    createdById: req.user.id,
    lastEditedById: req.user.id,
    content: "",
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });

  const doc = { id: docRef.id, title, type, language, workspaceId: req.params.wid };
  res.status(201).json({ doc });
});

// GET /api/docs/:id — get document content
router.get("/docs/:id", async (req, res) => {
  const docSnap = await collections.documents.doc(req.params.id).get();
  if (!docSnap.exists || docSnap.data().isDeleted) {
    return res.status(404).json({ error: "Document not found" });
  }

  const data = docSnap.data();

  // Check user is in the workspace
  const memberSnap = await collections.workspaceMembers
    .where("workspaceId", "==", data.workspaceId)
    .where("userId", "==", req.user.id)
    .limit(1)
    .get();

  if (memberSnap.empty) return res.status(403).json({ error: "Access denied" });

  const creatorDoc = await collections.users.doc(data.createdById).get();
  const creator = creatorDoc.exists ? creatorDoc.data() : {};

  res.json({
    doc: {
      id: docSnap.id,
      ...data,
      createdBy: { id: data.createdById, name: creator.name || "Unknown" },
    },
  });
});

// PATCH /api/docs/:id — update metadata or content
router.patch("/docs/:id", async (req, res) => {
  const { title, content } = req.body;
  const updates = { lastEditedById: req.user.id, updatedAt: new Date().toISOString() };
  if (title) updates.title = title;
  if (content !== undefined) updates.content = content;

  await collections.documents.doc(req.params.id).update(updates);
  const updated = await collections.documents.doc(req.params.id).get();
  res.json({ doc: { id: updated.id, ...updated.data() } });
});

// DELETE /api/docs/:id — soft delete
router.delete("/docs/:id", async (req, res) => {
  await collections.documents.doc(req.params.id).update({ isDeleted: true });
  res.json({ message: "Document deleted" });
});

// ─── Versions ─────────────────────────────────────────────────────────────────

// GET /api/docs/:id/versions
router.get("/docs/:id/versions", async (req, res) => {
  const snap = await collections.documentVersions
    .where("documentId", "==", req.params.id)
    .orderBy("createdAt", "desc")
    .get();

  const versions = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();
      const saverDoc = await collections.users.doc(data.savedById).get();
      const saver = saverDoc.exists ? saverDoc.data() : {};
      return {
        id: doc.id,
        ...data,
        savedBy: { id: data.savedById, name: saver.name || "Unknown" },
      };
    })
  );

  res.json({ versions });
});

// POST /api/docs/:id/versions — save snapshot
router.post("/docs/:id/versions", async (req, res) => {
  const { message } = req.body;
  const docSnap = await collections.documents.doc(req.params.id).get();
  if (!docSnap.exists) return res.status(404).json({ error: "Document not found" });

  const docData = docSnap.data();
  const versionRef = collections.documentVersions.doc();
  await versionRef.set({
    documentId: req.params.id,
    savedById: req.user.id,
    content: docData.content,
    message: message || `Saved by ${req.user.name}`,
    createdAt: new Date().toISOString(),
  });

  const version = { id: versionRef.id, documentId: req.params.id, message };
  res.status(201).json({ version });
});

// POST /api/docs/:id/versions/:vid/restore
router.post("/docs/:id/versions/:vid/restore", async (req, res) => {
  const versionSnap = await collections.documentVersions.doc(req.params.vid).get();
  if (!versionSnap.exists) return res.status(404).json({ error: "Version not found" });

  const versionData = versionSnap.data();
  const currentSnap = await collections.documents.doc(req.params.id).get();
  const currentData = currentSnap.data();
  const now = new Date().toISOString();

  // Auto-save current state before restoring
  await collections.documentVersions.add({
    documentId: req.params.id,
    savedById: req.user.id,
    content: currentData.content,
    message: `Auto-saved before restore to ${req.params.vid}`,
    createdAt: now,
  });

  await collections.documents.doc(req.params.id).update({
    content: versionData.content,
    lastEditedById: req.user.id,
    updatedAt: now,
  });

  const updated = await collections.documents.doc(req.params.id).get();
  res.json({ doc: { id: updated.id, ...updated.data() }, message: "Restored successfully" });
});

// ─── Comments ─────────────────────────────────────────────────────────────────

// GET /api/docs/:id/comments
router.get("/docs/:id/comments", async (req, res) => {
  // Fetch top-level comments
  const snap = await collections.comments
    .where("documentId", "==", req.params.id)
    .where("parentCommentId", "==", null)
    .orderBy("createdAt", "asc")
    .get();

  const comments = await Promise.all(
    snap.docs.map(async (doc) => {
      const data = doc.data();

      // Fetch author
      const userDoc = await collections.users.doc(data.userId).get();
      const userData = userDoc.exists ? userDoc.data() : {};

      // Fetch replies
      const repliesSnap = await collections.comments
        .where("parentCommentId", "==", doc.id)
        .orderBy("createdAt", "asc")
        .get();

      const replies = await Promise.all(
        repliesSnap.docs.map(async (replyDoc) => {
          const replyData = replyDoc.data();
          const replyUserDoc = await collections.users.doc(replyData.userId).get();
          const replyUser = replyUserDoc.exists ? replyUserDoc.data() : {};
          return {
            id: replyDoc.id,
            ...replyData,
            user: { id: replyData.userId, name: replyUser.name || "Unknown" },
          };
        })
      );

      return {
        id: doc.id,
        ...data,
        user: { id: data.userId, name: userData.name || "Unknown" },
        replies,
      };
    })
  );

  res.json({ comments });
});

// POST /api/docs/:id/comments
router.post("/docs/:id/comments", async (req, res) => {
  const { content, positionAnchor, parentCommentId } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  const commentRef = collections.comments.doc();
  const now = new Date().toISOString();
  await commentRef.set({
    documentId: req.params.id,
    userId: req.user.id,
    content,
    positionAnchor: positionAnchor || null,
    parentCommentId: parentCommentId || null,
    isResolved: false,
    createdAt: now,
    updatedAt: now,
  });

  const comment = {
    id: commentRef.id,
    documentId: req.params.id,
    content,
    user: { id: req.user.id, name: req.user.name },
  };
  res.status(201).json({ comment });
});


// PATCH /api/docs/:id/comments/:cid
router.patch("/docs/:id/comments/:cid", async (req, res) => {
  const { content, isResolved } = req.body;
  const updates = { updatedAt: new Date().toISOString() };
  if (content) updates.content = content;
  if (isResolved !== undefined) updates.isResolved = isResolved;

  await collections.comments.doc(req.params.cid).update(updates);
  const updated = await collections.comments.doc(req.params.cid).get();
  res.json({ comment: { id: updated.id, ...updated.data() } });
});


// DELETE /api/docs/:id/comments/:cid
router.delete("/docs/:id/comments/:cid", async (req, res) => {
  await collections.comments.doc(req.params.cid).delete();
  res.json({ message: "Comment deleted" });
});

module.exports = router;
