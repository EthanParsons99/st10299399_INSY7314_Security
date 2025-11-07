// backend/routes/user.mjs
import express from "express";
import db from "../db/conn.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { sanitizeInput } from "../middleware/inputValidation.mjs"; // Assuming sanitizeInput is exported
import { createSession, destroySession } from "../middleware/checkauth.mjs";

const router = express.Router();

// --- NEW HELPER FUNCTION ---
function generateAccountNumber() {
  let accountNumber = '';
  for (let i = 0; i < 10; i++) {
    accountNumber += Math.floor(Math.random() * 10);
  }
  return accountNumber;
}
// --- END NEW HELPER FUNCTION ---

// ============================================
// REGEX PATTERNS FOR WHITELISTING
// ============================================
const nameRegex = /^[a-zA-Z0-9._]{3,20}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const basicPasswordRegex = /^[A-Za-z\d@$!%*?&]{8,100}$/;
const accountNumberRegex = /^\d{10}$/; // --- NEW ---

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

// STRICT validation for signup
const validateSignupInput = (req, res, next) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  if (!nameRegex.test(name)) {
    return res.status(400).json({ 
      message: "Invalid name format. Use 3-20 alphanumeric characters, dots, or underscores." 
    });
  }

  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Invalid password format. Must be at least 8 characters with uppercase, lowercase, number, and special character." 
    });
  }
  next();
};

// --- MODIFIED LOGIN VALIDATION ---
const validateLoginInput = (req, res, next) => {
  const { name, password, accountNumber } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  // First, check the name format for everyone
  if (!nameRegex.test(name)) {
    return res.status(400).json({ message: "Invalid name format." });
  }

  // If the user IS NOT the employee, they MUST provide a valid account number
  if (name !== process.env.EMPLOYEE_USERNAME) {
    if (!accountNumber) {
      return res.status(400).json({ message: "Account number is required for customer login." });
    }
    if (!accountNumberRegex.test(accountNumber)) {
      return res.status(400).json({ message: "Invalid account number format. Must be 10 digits." });
    }
  }

  // Finally, check password format for everyone
  if (!basicPasswordRegex.test(password)) {
    return res.status(400).json({ message: "Invalid login credentials format." });
  }
  
  next();
};

// ============================================
// RATE LIMITERS
// ============================================

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 2 minutes.',
  skip: (req, res) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many signup attempts. Please try again later.'
});

// ============================================
// MODIFIED SIGNUP ROUTE
// ============================================
router.post("/signup", signupLimiter, validateSignupInput, async (req, res) => {
  try {
    const { name, password } = req.body;

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    
    const existingUser = await collection.findOne({ name: sanitizedName });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // --- NEW: GENERATE UNIQUE ACCOUNT NUMBER ---
    let accountNumber;
    let isUnique = false;
    while (!isUnique) {
      accountNumber = generateAccountNumber();
      const existingAccount = await collection.findOne({ accountNumber });
      if (!existingAccount) {
        isUnique = true;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newDocument = { 
      name: sanitizedName, 
      password: hashedPassword, 
      accountNumber: accountNumber, // <-- MODIFIED
      createdAt: new Date() 
    };
    
    const result = await collection.insertOne(newDocument);

    res.status(201).json({ 
      message: "Signup successful", 
      userId: result.insertedId,
      accountNumber: accountNumber // <-- MODIFIED
    });
    
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

// ============================================
// MODIFIED LOGIN ROUTE
// ============================================
router.post("/login", loginLimiter, validateLoginInput, async (req, res) => {
  try {
    const { name, password, accountNumber } = req.body; // <-- MODIFIED

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");

    let user = null;
    let role = 'customer';
    let passwordMatch = false;
    
    // --- MODIFIED: Handle Customer vs Employee Login ---
    if (sanitizedName === process.env.EMPLOYEE_USERNAME) {
      passwordMatch = await bcrypt.compare(password, process.env.EMPLOYEE_PASSWORD);
      if (passwordMatch) {
        user = { name: process.env.EMPLOYEE_USERNAME }; // Keep user object simple
        role = 'employee';
      }
    } else {
      // Customer login now requires all three fields for lookup
      user = await collection.findOne({ name: sanitizedName, accountNumber: accountNumber });
      if (user) {
        passwordMatch = await bcrypt.compare(password, user.password);
      }
    }

    if (!user || !passwordMatch) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    const clientIp = req.ip || req.connection.remoteAddress;
    const sessionId = createSession(clientIp, user.name, null, role);

    const expiresIn = 3600;
    const token = jwt.sign(
      { name: user.name, sessionId: sessionId, role: role },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // const { activeSessions } = await import("../middleware/checkauth.mjs");
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      session.token = token;
      activeSessions.set(sessionId, session);
    }

    res.status(200).json({
      message: "Authentication successful",
      name: user.name,
      role: role,
      token: token,
      expiresIn: expiresIn,
      accountNumber: user.accountNumber // <-- MODIFIED (will be undefined for employee, which is fine)
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// ============================================
// LOGOUT ROUTE (Unchanged)
// ============================================
router.post("/logout", (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (token) {
      try {
        const decodedToken = jwt.decode(token);
        if (decodedToken && decodedToken.sessionId) {
          destroySession(decodedToken.sessionId);
          console.log('Session destroyed for token');
        }
      } catch (err) {
        console.error('Error destroying session:', err);
      }
    }
    
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;