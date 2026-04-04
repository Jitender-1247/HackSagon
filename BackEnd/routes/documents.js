const router = require("express").Router({ mergeParams: true });
const { collections } = require("../config/firebase");
const { authenticate, requireWorkspaceMember } = require("../middleware/middleware");

router.use(authenticate);

// GET /api/v1/workspaces/:wid/docs
router.get("/workspaces/:wid/docs", requireWorkspaceMember(), async (req, res) => {
  try {
    const snap = await collections.documents
      .where("workspaceId", "==", req.params.wid)
      .get();  // ← no orderBy, no composite index needed

    const docs = await Promise.all(
      snap.docs
        .filter(doc => !doc.data().isDeleted)
        .map(async (doc) => {
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

    // Sort by updatedAt descending in JS instead
    docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ docs });
  } catch (err) {
    console.error("GET /docs error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/workspaces/:wid/docs
router.post("/workspaces/:wid/docs", requireWorkspaceMember("editor"), async (req, res) => {
  try {
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

    res.status(201).json({ doc: { id: docRef.id, title, type, language, workspaceId: req.params.wid } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/docs/:id
router.get("/docs/:id", async (req, res) => {
  try {
    const docSnap = await collections.documents.doc(req.params.id).get();
    if (!docSnap.exists || docSnap.data().isDeleted) {
      return res.status(404).json({ error: "Document not found" });
    }

    const data = docSnap.data();

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/docs/:id
router.patch("/docs/:id", async (req, res) => {
  try {
    const { title, content } = req.body;
    const updates = { lastEditedById: req.user.id, updatedAt: new Date().toISOString() };
    if (title) updates.title = title;
    if (content !== undefined) updates.content = content;

    await collections.documents.doc(req.params.id).update(updates);
    const updated = await collections.documents.doc(req.params.id).get();
    res.json({ doc: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/docs/:id
router.delete("/docs/:id", async (req, res) => {
  try {
    await collections.documents.doc(req.params.id).update({ isDeleted: true });
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/docs/:id/versions
router.get("/docs/:id/versions", async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/docs/:id/versions
router.post("/docs/:id/versions", async (req, res) => {
  try {
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

    res.status(201).json({ version: { id: versionRef.id, documentId: req.params.id, message } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/docs/:id/versions/:vid/restore
router.post("/docs/:id/versions/:vid/restore", async (req, res) => {
  try {
    const versionSnap = await collections.documentVersions.doc(req.params.vid).get();
    if (!versionSnap.exists) return res.status(404).json({ error: "Version not found" });

    const versionData = versionSnap.data();
    const currentSnap = await collections.documents.doc(req.params.id).get();
    const currentData = currentSnap.data();
    const now = new Date().toISOString();

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/docs/:id/comments
router.get("/docs/:id/comments", async (req, res) => {
  try {
    const snap = await collections.comments
      .where("documentId", "==", req.params.id)
      .where("parentCommentId", "==", null)
      .orderBy("createdAt", "asc")
      .get();

    const comments = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await collections.users.doc(data.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/docs/:id/comments
router.post("/docs/:id/comments", async (req, res) => {
  try {
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

    res.status(201).json({
      comment: {
        id: commentRef.id,
        documentId: req.params.id,
        content,
        user: { id: req.user.id, name: req.user.name },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/docs/:id/comments/:cid
router.patch("/docs/:id/comments/:cid", async (req, res) => {
  try {
    const { content, isResolved } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (content) updates.content = content;
    if (isResolved !== undefined) updates.isResolved = isResolved;

    await collections.comments.doc(req.params.cid).update(updates);
    const updated = await collections.comments.doc(req.params.cid).get();
    res.json({ comment: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/docs/:id/comments/:cid
router.delete("/docs/:id/comments/:cid", async (req, res) => {
  try {
    await collections.comments.doc(req.params.cid).delete();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;