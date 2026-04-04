const jwt = require ('jsonwebtoken');
const { collections } = require("../config/firebase");


const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userDoc = await collections.users.doc(payload.uid).get();
    if (!userDoc.exists) return res.status(401).json({ error: "User not found" });

    const data = userDoc.data();
    req.user = {
      id: userDoc.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Role-based guard. Usage: requireRole("admin") or requireRole(["admin","editor"])
 */
const requireRole = (roles) => (req, res, next) => {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${allowed.join(" or ")}` });
  }
  next();
};

/**
 * Checks user is a member of the workspace specified in req.params.workspaceId or req.params.wid
 * Attaches req.workspaceMember with { role }
 */
const requireWorkspaceMember = (minRole = null) => async (req, res, next) => {
  const workspaceId = req.params.workspaceId || req.params.wid;
  if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });

  // Query workspaceMembers where workspaceId + userId match
  const snap = await collections.workspaceMembers
    .where("workspaceId", "==", workspaceId)
    .where("userId", "==", req.user.id)
    .limit(1)
    .get();

  if (snap.empty) {
    return res.status(403).json({ error: "You are not a member of this workspace" });
  }

  const member = snap.docs[0].data();
  const hierarchy = { viewer: 0, editor: 1, admin: 2 };

  if (minRole && hierarchy[member.role] < hierarchy[minRole]) {
    return res.status(403).json({ error: `Requires at least ${minRole} role` });
  }

  req.workspaceMember = member;
  next();
};

module.exports = { authenticate, requireRole, requireWorkspaceMember };
