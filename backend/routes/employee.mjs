// backend/routes/employee.mjs
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/conn.mjs";
import checkAuth, { 
  createSession, 
  destroySession, 
  checkEmployeeRole,
  recordFailedLogin,
  isAccountLocked,
  clearLoginAttempts
} from "../middleware/checkauth.mjs";

const router = express.Router();

// Employee login with username
router.post("/login", async (req, res) => {
  try {
    let { name, password } = req.body;

    // Input validation
    if (!name || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    // Sanitize username
    name = name.trim();

    // Check if account is locked
    if (isAccountLocked(name)) {
      console.warn(`Locked account login attempt: ${name}`);
      return res.status(429).json({ 
        message: "Account temporarily locked due to multiple failed attempts. Try again later." 
      });
    }

    // Fetch employee from database
    const collection = db.collection("employees");
    const employee = await collection.findOne({ name });

    if (!employee) {
      recordFailedLogin(name);
      // Don't reveal whether username exists
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify employee role
    if (employee.role !== 'employee') {
      console.warn(`Non-employee attempted employee login: ${name}`);
      return res.status(403).json({ message: "Access denied. Employee credentials required." });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      const attemptCount = recordFailedLogin(name);
      console.warn(`Failed login attempt ${attemptCount} for employee: ${name}`);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Clear failed attempts on successful login
    clearLoginAttempts(name);

    // Get client IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() 
      || req.ip 
      || req.connection.remoteAddress;

    // Create session first to get sessionId
    const sessionId = createSession(clientIp, employee.name, '', 'employee');

    // Create JWT token with sessionId
    const token = jwt.sign(
      { 
        name: employee.name,
        role: 'employee',
        sessionId
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" } // Shorter expiration for employees
    );

    // Update session with final token
    const { activeSessions } = await import("../middleware/checkauth.mjs");
    const session = activeSessions.get(sessionId);
    if (session) {
      session.token = token;
    }

    console.log(`✓ Employee login successful: ${employee.name}`);

    res.status(200).json({
      token,
      user: {
        name: employee.name,
        role: 'employee'
      }
    });

  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// Employee logout
router.post("/logout", checkAuth, checkEmployeeRole, (req, res) => {
  destroySession(req.userData.sessionId);
  sessionStorage.clear();
  res.status(200).json({ message: "Logged out successfully." });
});

// Protected employee dashboard
router.get("/dashboard", checkAuth, checkEmployeeRole, (req, res) => {
  res.status(200).json({ 
    message: "Employee dashboard",
    user: req.userData 
  });
});

export default router;