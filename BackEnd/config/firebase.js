var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const collections = {
  users:                  db.collection("users"),
  workspaces:             db.collection("workspaces"),
  workspaceMembers:       db.collection("workspaceMembers"),
  documents:              db.collection("documents"),
  documentVersions:       db.collection("documentVersions"),
  comments:               db.collection("comments"),
  operations:             db.collection("operations"),
  collaborationSessions:  db.collection("collaborationSessions"),
  aiInteractions:         db.collection("aiInteractions"),
  tasks:                  db.collection("tasks"),           // ← new
  notifications:          db.collection("notifications"),   // ← new
};

module.exports = { db, admin, collections };
