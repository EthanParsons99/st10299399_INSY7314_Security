// backend/middleware/checkauth.mjs
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Session store to track active sessions 
export const activeSessions = new Map();
// Additional security: Account lockout after failed attempts
export const loginAttempts = new Map();

export default (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication failed: Token missing." });
    }

    // Verify token signature
    const decodedToken = jwt.verify(
      token, 
      process.env.JWT_SECRET
    );

    const sessionId = decodedToken.sessionId;
    
    // Check if session exists
    if (!activeSessions.has(sessionId)) {
      console.warn('Session not found:', sessionId);
      return res.status(401).json({ message: "Session invalid or expired." });
    }

    const sessionData = activeSessions.get(sessionId);

    // Verify the token matches what we stored (security check)
    if (sessionData.token !== token) {
      console.warn('Token mismatch for session:', sessionId);
      return res.status(401).json({ message: "Session invalid or expired." });
    }

    // Verify IP hasn't changed (prevents session jacking)
    const storedIp = sessionData.ip;
    const currentIp = req.ip || req.connection.remoteAddress;
    
    console.log('IP Check - Stored:', storedIp, 'Current:', currentIp);
    
    if (storedIp !== currentIp) {
      console.warn('IP mismatch detected - possible session jacking attempt');
      activeSessions.delete(sessionId);
      return res.status(401).json({ message: "Session hijacking detected. Please log in again." });
    }

    // Verify token hasn't expired
    if (decodedToken.exp && Date.now() >= decodedToken.exp * 1000) {
      console.warn('Token expired for session:', sessionId);
      activeSessions.delete(sessionId);
      return res.status(401).json({ message: "Token expired." });
    }

    // Token is valid, attach user data to request
    req.userData = { 
      name: decodedToken.name,
      sessionId: sessionId,
      role: decodedToken.role
    };

    next();

  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: "Authentication failed: Invalid token." });
  }
};

export function createSession(ip, userName, token, role = 'customer') {
  const sessionId = crypto.randomUUID();
  
  // Store the token as well (for verification)
  activeSessions.set(sessionId, { 
    ip, 
    userName, 
    token,
    role,
    createdAt: Date.now() 
  });
  
  console.log('Session created:', sessionId, 'for user:', userName, 'from IP:', ip, 'with role:', role);
  return sessionId;
}

export function destroySession(sessionId) {
  console.log('Session destroyed:', sessionId);
  activeSessions.delete(sessionId);
}

export const checkEmployeeRole = (req, res, next) => {
  if (!req.userData) {
    return res.status(401).json({ message: "Authentication required." });
  }
  
  if (req.userData.role !== 'employee') {
    // Log suspicious access attempts
    console.warn(`Unauthorized employee access attempt by: ${req.userData.name} (${req.userData.role})`);
    return res.status(403).json({ message: "Forbidden: Employee access only." });
  }
  
  next();
};



export function recordFailedLogin(identifier) {
  const attempts = loginAttempts.get(identifier) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  
  loginAttempts.set(identifier, attempts);
  
  // Clear after 15 minutes
  setTimeout(() => {
    loginAttempts.delete(identifier);
  }, 15 * 60 * 1000);
  
  return attempts.count;
}

export function isAccountLocked(identifier) {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return false;
  
  // Lock after 5 failed attempts within 15 minutes
  if (attempts.count >= 5) {
    const timeSinceFirst = Date.now() - attempts.firstAttempt;
    if (timeSinceFirst < 15 * 60 * 1000) {
      return true;
    }
  }
  return false;
}

export function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}
