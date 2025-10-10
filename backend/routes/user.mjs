// backend/routes/user.mjs
import express from "express";
import db from "../db/conn.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { validateInput, sanitizeInput, validationRules } from "../middleware/inputValidation.mjs";
import { createSession, destroySession } from "../middleware/checkauth.mjs";

const router = express.Router();

// ============================================
// REGEX PATTERNS FOR WHITELISTING
// ============================================
const nameRegex = /^[a-zA-Z0-9._]{3,20}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const basicPasswordRegex = /^[A-Za-z\d@$!%*?&]{8,100}$/;

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

// LOGIN validation (less strict on password complexity, still checks format)
const validateLoginInput = (req, res, next) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  if (!nameRegex.test(name)) {
    return res.status(400).json({ 
      message: "Invalid name format." 
    });
  }

  if (!basicPasswordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Invalid login credentials format." 
    });
  }
  
  next();
};

// ============================================
// RATE LIMITERS
// ============================================

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 2 minutes.',
  skip: (req, res) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many signup attempts. Please try again later.'
});

// ============================================
// SIGNUP ROUTE
// ============================================
router.post("/signup", signupLimiter, validateSignupInput, async (req, res) => {
  try {
    const { name, password } = req.body;

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    
    // Check if user already exists
    const existingUser = await collection.findOne({ name: sanitizedName });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newDocument = { 
      name: sanitizedName, 
      password: hashedPassword, 
      createdAt: new Date() 
    };
    
    const result = await collection.insertOne(newDocument);

    res.status(201).json({ 
      message: "Signup successful", 
      userId: result.insertedId 
    });
    
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

// ============================================
// LOGIN ROUTE
// ============================================
router.post("/login", loginLimiter, validateLoginInput, async (req, res) => {
  try {
    const { name, password } = req.body;

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    
    // Find user
    const user = await collection.findOne({ name: sanitizedName });
    if (!user) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    // Get client IP
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log('Login - Client IP:', clientIp);

    // Create session FIRST
    const sessionId = createSession(clientIp, user.name, null); // token will be added after

    // Create JWT token with session ID
    const expiresIn = 3600; // 1 hour
    const token = jwt.sign(
      { 
        name: user.name, 
        sessionId: sessionId,
        iat: Math.floor(Date.now() / 1000) 
      },
      process.env.JWT_SECRET || "your_long_secret_key_change_this",
      { expiresIn }
    );

    // Update session with the final token
    const { activeSessions } = await import("../middleware/checkauth.mjs");
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      session.token = token;
      activeSessions.set(sessionId, session);
    }

    res.status(200).json({
      message: "Authentication successful",
      name: user.name,
      token: token,
      expiresIn: expiresIn
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// ============================================
// LOGOUT ROUTE
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