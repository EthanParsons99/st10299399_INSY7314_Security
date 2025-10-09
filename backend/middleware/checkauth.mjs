import jwt from "jsonwebtoken";
import crypto from "crypto";

// Session store to track active sessions (in production, use Redis)
const activeSessions = new Map();

export default (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication failed: Token missing." });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "your_long_secret_key_change_this");

    const sessionId = decodedToken.sessionId;
    if (!activeSessions.has(sessionId) || activeSessions.get(sessionId).token !== token) {
      return res.status(401).json({ message: "Session invalid or expired." });
    }

    const storedIp = activeSessions.get(sessionId).ip;
    const currentIp = req.ip || req.connection.remoteAddress;
    if (storedIp !== currentIp) {
      activeSessions.delete(sessionId);
      return res.status(401).json({ message: "Session hijacking detected. Please log in again." });
    }

    if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
      activeSessions.delete(sessionId);
      return res.status(401).json({ message: "Token expired." });
    }

    req.userData = { 
      name: decodedToken.name,
      sessionId: sessionId
    };

    next();

  } catch (error) {
    return res.status(401).json({ message: "Authentication failed: Invalid token." });
  }
};

export function createSession(token, ip, userName) {
  const sessionId = crypto.randomUUID();
  activeSessions.set(sessionId, { token, ip, userName, createdAt: Date.now() });
  return sessionId;
}

export function destroySession(sessionId) {
  activeSessions.delete(sessionId);
}
