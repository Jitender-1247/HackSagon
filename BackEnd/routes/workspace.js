const router = require("express").Router();
const { collections } = require("../config/firebase");
const { authenticate, requireWorkspaceMember } = require("../middleware/middleware");

router.use(authenticate);

// ════════════════════════════════════════════════════════════
// WORKSPACES
// ════════════════════════════════════════════════════════════

// GET /api/v1/workspaces — list all workspaces current user belongs to
router.get("/workspaces", async (req, res) => {
  try {
    const memberSnap = await collections.workspaceMembers
      .where("userId", "==", req.user.id)
      .get();

    const workspaces = await Promise.all(
      memberSnap.docs.map(async (doc) => {
        const { workspaceId, role } = doc.data();
        const wsDoc = await collections.workspaces.doc(workspaceId).get();
        if (!wsDoc.exists) return null;

        const memberCount = await collections.workspaceMembers
          .where("workspaceId", "==", workspaceId)
          .get()
          .then((s) => s.size);

        return { id: wsDoc.id, ...wsDoc.data(), role, memberCount };
      })
    );

    res.json({ workspaces: workspaces.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/workspaces — create a new workspace
router.post("/workspaces", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const now = new Date().toISOString();
    const wsRef = collections.workspaces.doc();
    await wsRef.set({
      name,
      description: description || "",
      ownerId: req.user.id,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-add creator as admin member
    await collections.workspaceMembers.doc().set({
      workspaceId: wsRef.id,
      userId: req.user.id,
      role: "admin",
      joinedAt: now,
    });

    res.status(201).json({ workspace: { id: wsRef.id, name, description } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/workspaces/:wid — workspace details
router.get("/workspaces/:wid", requireWorkspaceMember(), async (req, res) => {
  try {
    const wsDoc = await collections.workspaces.doc(req.params.wid).get();
    if (!wsDoc.exists) return res.status(404).json({ error: "Workspace not found" });

    const memberCount = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .get()
      .then((s) => s.size);

    res.json({ workspace: { id: wsDoc.id, ...wsDoc.data(), memberCount } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/workspaces/:wid — update workspace
router.patch("/workspaces/:wid", requireWorkspaceMember("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    await collections.workspaces.doc(req.params.wid).update(updates);
    const updated = await collections.workspaces.doc(req.params.wid).get();
    res.json({ workspace: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/workspaces/:wid
router.delete("/workspaces/:wid", requireWorkspaceMember("admin"), async (req, res) => {
  try {
    await collections.workspaces.doc(req.params.wid).delete();
    // Remove all members
    const memberSnap = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .get();
    await Promise.all(memberSnap.docs.map((d) => d.ref.delete()));
    res.json({ message: "Workspace deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// MEMBERS
// ════════════════════════════════════════════════════════════

// GET /api/v1/workspaces/:wid/members
router.get("/workspaces/:wid/members", requireWorkspaceMember(), async (req, res) => {
  try {
    const snap = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .get();

    const members = await Promise.all(
      snap.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await collections.users.doc(data.userId).get();
        const user = userDoc.exists ? userDoc.data() : {};
        return {
          userId: data.userId,
          role: data.role,
          joinedAt: data.joinedAt,
          name: user.name || "Unknown",
          email: user.email || "",
          isOnline: user.isOnline || false,
        };
      })
    );

    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/workspaces/:wid/members — invite by email
router.post("/workspaces/:wid/members", requireWorkspaceMember("admin"), async (req, res) => {
  try {
    const { email, role = "editor" } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const userSnap = await collections.users.where("email", "==", email).limit(1).get();
    if (userSnap.empty) return res.status(404).json({ error: "User not found" });

    const userDoc = userSnap.docs[0];
    const userId = userDoc.id;

    // Check not already a member
    const existing = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (!existing.empty) return res.status(409).json({ error: "Already a member" });

    const now = new Date().toISOString();
    await collections.workspaceMembers.doc().set({
      workspaceId: req.params.wid,
      userId,
      role,
      joinedAt: now,
    });

    // Create a notification for the invited user
    await collections.notifications.doc().set({
      userId,
      type: "workspace_invite",
      message: `You were added to a workspace`,
      referenceId: req.params.wid,
      referenceType: "workspace",
      isRead: false,
      createdAt: now,
    });

    res.status(201).json({ message: "Member added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/workspaces/:wid/members/:uid — update role
router.patch("/workspaces/:wid/members/:uid", requireWorkspaceMember("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "role is required" });

    const snap = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .where("userId", "==", req.params.uid)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Member not found" });
    await snap.docs[0].ref.update({ role });
    res.json({ message: "Role updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/workspaces/:wid/members/:uid — remove member
router.delete("/workspaces/:wid/members/:uid", requireWorkspaceMember("admin"), async (req, res) => {
  try {
    const snap = await collections.workspaceMembers
      .where("workspaceId", "==", req.params.wid)
      .where("userId", "==", req.params.uid)
      .limit(1)
      .get();

    if (snap.empty) return res.status(404).json({ error: "Member not found" });
    await snap.docs[0].ref.delete();
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════

// GET /api/v1/workspaces/:wid/tasks
router.get("/workspaces/:wid/tasks", requireWorkspaceMember(), async (req, res) => {
  try {
    const snap = await collections.tasks
      .where("workspaceId", "==", req.params.wid)
      .orderBy("createdAt", "desc")
      .get();

    const tasks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/workspaces/:wid/tasks
router.post("/workspaces/:wid/tasks", requireWorkspaceMember("editor"), async (req, res) => {
  try {
    const { title, description, priority = "medium", assignedToId, assignedToName, dueDate } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });

    const now = new Date().toISOString();
    const taskRef = collections.tasks.doc();
    const taskData = {
      workspaceId: req.params.wid,
      createdById: req.user.id,
      title,
      description: description || "",
      status: "todo",
      priority,
      assignedToId: assignedToId || null,
      assignedToName: assignedToName || "",
      dueDate: dueDate || null,
      createdAt: now,
      updatedAt: now,
    };
    await taskRef.set(taskData);

    // Notify assigned user
    if (assignedToId && assignedToId !== req.user.id) {
      await collections.notifications.doc().set({
        userId: assignedToId,
        type: "task_assigned",
        message: `You were assigned a task: "${title}"`,
        referenceId: taskRef.id,
        referenceType: "task",
        isRead: false,
        createdAt: now,
      });
    }

    res.status(201).json({ task: { id: taskRef.id, ...taskData } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/tasks/:id
router.get("/tasks/:id", async (req, res) => {
  try {
    const taskDoc = await collections.tasks.doc(req.params.id).get();
    if (!taskDoc.exists) return res.status(404).json({ error: "Task not found" });
    res.json({ task: { id: taskDoc.id, ...taskDoc.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/tasks/:id
router.patch("/tasks/:id", async (req, res) => {
  try {
    const { status, priority, title, description, dueDate } = req.body;
    const updates = { updatedAt: new Date().toISOString() };
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.dueDate = dueDate;

    await collections.tasks.doc(req.params.id).update(updates);
    const updated = await collections.tasks.doc(req.params.id).get();
    res.json({ task: { id: updated.id, ...updated.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/tasks/:id
router.delete("/tasks/:id", async (req, res) => {
  try {
    await collections.tasks.doc(req.params.id).delete();
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════════════════════════════════

// GET /api/v1/notifications
router.get("/notifications", async (req, res) => {
  try {
    const snap = await collections.notifications
      .where("userId", "==", req.user.id)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const notifications = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    await collections.notifications.doc(req.params.id).update({ isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/notifications/read-all
router.patch("/notifications/read-all", async (req, res) => {
  try {
    const snap = await collections.notifications
      .where("userId", "==", req.user.id)
      .where("isRead", "==", false)
      .get();
    await Promise.all(snap.docs.map((doc) => doc.ref.update({ isRead: true })));
    res.json({ message: "All marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/notifications/:id
router.delete("/notifications/:id", async (req, res) => {
  try {
    await collections.notifications.doc(req.params.id).delete();
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
