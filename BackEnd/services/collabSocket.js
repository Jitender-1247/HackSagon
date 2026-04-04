const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { collections } = require("../config/firebase");
const { name } = require("ejs");

const presence = new Map();

const getOrCreate = (docId) => {
  if (!presence.has(docId)) presence.set(docId, new Map());
  return presence.get(docId);
};

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

const initCollabSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET", "POST"] },
    maxHttpBufferSize: 5e6,
  });

  // ── JWT Auth middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET); // ← fix
      const userDoc = await collections.users.doc(payload.uid).get(); // ← fix
      if (!userDoc.exists) return next(new Error("User not found"));

      const userData = userDoc.data();
      socket.user = { id: userDoc.id, name: userData.name };
      socket.color = nextColor();
      next();
    } catch (err) {
      console.error("[WS] Auth error:", err.message); // ← helpful for debugging
      next(new Error("Invalid token"));
    }
  });

  // ── Connection handler ───────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[WS] ${socket.user.name} connected`);

    // ── doc:join ─────────────────────────────────────────────────────────
    socket.on("doc:join", async ({ documentId }) => {
      if (!documentId) return;
      socket.currentDoc = documentId;
      await socket.join(documentId);

      const docPresence = getOrCreate(documentId);
      docPresence.set(socket.user.id, {
        userId:   socket.user.id,
        name:     socket.user.name,
        color:    socket.color,
        cursor:   null,
        joinedAt: new Date().toISOString(),
      });

      // Upsert collaboration session in Firestore
      const sessionQuery = await collections.collaborationSessions
        .where("documentId", "==", documentId)
        .where("userId", "==", socket.user.id)
        .limit(1)
        .get();

      const sessionData = {
        documentId,
        userId: socket.user.id,
        color: socket.color,
        lastActiveAt: new Date().toISOString(),
      };

      if (sessionQuery.empty) {
        await collections.collaborationSessions.add({
          ...sessionData,
          createdAt: new Date().toISOString(),
        });
      } else {
        await sessionQuery.docs[0].ref.update(sessionData);
      }

      // ← broadcast to ALL in room including the new joiner
      io.to(documentId).emit("doc:presence", {
        documentId,
        users: Array.from(docPresence.values()),
      });

      console.log(`[WS] ${socket.user.name} joined doc ${documentId}`);
    });

    // ── doc:operation ────────────────────────────────────────────────────
    socket.on("doc:operation", async ({ documentId, update, revision }) => {
      if (!documentId || !update) return;

      socket.to(documentId).emit("doc:operation", {
        userId: socket.user.id,
        name:   socket.user.name,
        color:  socket.color,
        update,
        revision,
      });

      collections.operations.add({
        documentId,
        userId:    socket.user.id,
        type:      "insert",
        position:  0,
        content:   "[yjs-binary]",
        revision:  revision || 0,
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      const userPresence = getOrCreate(documentId).get(socket.user.id);
      if (userPresence) userPresence.lastActiveAt = new Date().toISOString();
    });

    // ── doc:cursor ───────────────────────────────────────────────────────
    socket.on("doc:cursor", ({ documentId, position, selection }) => {
      if (!documentId) return;

      const docPresence = getOrCreate(documentId);
      const userData = docPresence.get(socket.user.id);
      if (userData) userData.cursor = position;

      socket.to(documentId).emit("doc:cursor", {
        userId:    socket.user.id,
        name:      socket.user.name,
        color:     socket.color,
        position,
        selection, // ← passes selection through for remote highlights
      });
    });

    // ── doc:leave ────────────────────────────────────────────────────────
    const handleLeave = async (documentId) => {
      if (!documentId) return;
      await socket.leave(documentId);

      const docPresence = getOrCreate(documentId);
      docPresence.delete(socket.user.id);

      io.to(documentId).emit("doc:presence", {
        documentId,
        users: Array.from(docPresence.values()),
      });

      console.log(`[WS] ${socket.user.name} left doc ${documentId}`);
    };

    socket.on("doc:leave", ({ documentId }) => handleLeave(documentId));

    // ── disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.currentDoc) handleLeave(socket.currentDoc);
      collections.users.doc(socket.user.id).update({ isOnline: false }).catch(() => {});
      console.log(`[WS] ${socket.user.name} disconnected`);
    });
  });

  return io;
};

module.exports = { initCollabSocket };