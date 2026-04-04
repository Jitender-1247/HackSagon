/**
 * CollabLearn WebSocket Collaboration Server
 * Built on Socket.io — handles:
 *  - Real-time document editing (Yjs ops forwarded as binary)
 *  - Live cursor tracking per user
 *  - Presence (who is editing what)
 *  - Operation logging to Firestore for audit trail
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { collections } = require("../config/firebase");

// In-memory presence store: docId → Map<userId, sessionData>
const presence = new Map();

const getOrCreate = (docId) => {
  if (!presence.has(docId)) presence.set(docId, new Map());
  return presence.get(docId);
};

/** Assign a unique color to each collaborator */
const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];
let colorIdx = 0;
const nextColor = () => COLORS[colorIdx++ % COLORS.length];

const initCollabSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", methods: ["GET", "POST"] },
    maxHttpBufferSize: 5e6, // 5MB for Yjs binary updates
  });

  // ── JWT Auth middleware ──────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const userDoc = await collections.users.doc(payload.userId).get();
      if (!userDoc.exists) return next(new Error("User not found"));

      const userData = userDoc.data();
      socket.user = { id: userDoc.id, name: userData.name };
      socket.color = nextColor();
      next();
    } catch {
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
        userId: socket.user.id,
        name: socket.user.name,
        color: socket.color,
        cursor: null,
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

      // Broadcast updated presence list to room
      io.to(documentId).emit("doc:presence", {
        documentId,
        users: Array.from(docPresence.values()),
      });

      console.log(`[WS] ${socket.user.name} joined doc ${documentId}`);
    });

    // ── doc:operation — forward Yjs update to other clients ──────────────
    socket.on("doc:operation", async ({ documentId, update, revision }) => {
      if (!documentId || !update) return;

      // Forward to everyone else in the room
      socket.to(documentId).emit("doc:operation", {
        userId: socket.user.id,
        update,
        revision,
      });

      // Log to Firestore (async, non-blocking)
      collections.operations.add({
        documentId,
        userId: socket.user.id,
        type: "insert", // Yjs handles actual OT internally
        position: 0,
        content: "[yjs-binary]",
        revision: revision || 0,
        createdAt: new Date().toISOString(),
      }).catch(() => {});

      // Update last active in presence map
      const userPresence = getOrCreate(documentId).get(socket.user.id);
      if (userPresence) userPresence.lastActiveAt = new Date().toISOString();
    });

    // ── doc:cursor — broadcast cursor / selection position ───────────────
    socket.on("doc:cursor", ({ documentId, position, selection }) => {
      if (!documentId) return;

      const docPresence = getOrCreate(documentId);
      const userData = docPresence.get(socket.user.id);
      if (userData) userData.cursor = position;

      socket.to(documentId).emit("doc:cursor", {
        userId: socket.user.id,
        name: socket.user.name,
        color: socket.color,
        position,
        selection,
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
