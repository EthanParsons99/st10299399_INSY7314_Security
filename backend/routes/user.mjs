// backend/routes/user.mjs
// backend/routes/user.mjs (Revised)

import express from "express";
import db from "../db/conn.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { validateInput, sanitizeInput, validationRules } from "../middleware/inputValidation.mjs";
import { createSession, destroySession } from "../middleware/checkauth.mjs";
import rateLimit from 'express-rate-limit'; 

const router = express.Router();

// Rate limiting for login
// 1. REGEX PATTERNS FOR WHITELISTING 🔒
const nameRegex = /^[a-zA-Z0-9._]{3,20}$/; 
// Strict format for new signups
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
// Basic sanitization for login (prevents huge payloads, but is not strict on content)
const basicPasswordRegex = /^[A-Za-z\d@$!%*?&]{8,100}$/;

// 2A. VALIDATION MIDDLEWARE FOR NEW SIGNUPS (STRICT)
const validateSignupInput = (req, res, next) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  // Enforce STRICT Name Format
  if (!nameRegex.test(name)) {
    return res.status(400).json({ 
      message: "Invalid name format. Use 3-20 alphanumeric characters, dots, or underscores." 
    });
  }

  // Enforce STRICT Password Format for NEW users
  if (!strongPasswordRegex.test(password)) {
    return res.status(400).json({ 
      message: "Invalid password format. Must be at least 8 characters and include uppercase, lowercase, number, and special character." 
    });
  }
  next();
};

// 2B. VALIDATION MIDDLEWARE FOR LOGIN (LESS STRICT on content)
const validateLoginInput = (req, res, next) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ message: "Name and password are required" });
  }

  // Enforce STRICT Name Format (Still needed to prevent injection in the `findOne` query)
  if (!nameRegex.test(name)) {
    return res.status(400).json({ 
      message: "Invalid name format. Use 3-20 alphanumeric characters, dots, or underscores." 
    });
  }

  // Enforce BASIC Password Sanitization (Only check characters and length, NOT complexity)
  if (!basicPasswordRegex.test(password)) {
     // We are using a generic error here to prevent brute force attackers 
     // from knowing exactly what format failed.
    return res.status(400).json({ 
      message: "Invalid login credentials format."
    });
  }
  
  next();
};


// 3. RATE LIMITER CONFIGURATION
const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 2 minutes.',
  skip: (req, res) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});

// Rate limiting for signup
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many signup attempts. Please try again later.'
});

// SIGNUP route
router.post("/signup", signupLimiter, async (req, res) => {
	windowMs: 15 * 60 * 1000, 
	max: 10, 
	standardHeaders: true, 
	legacyHeaders: false, 
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
});


// SIGNUP ROUTE: APPLY STRICT VALIDATION
router.post("/signup", validateSignupInput, async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ Message: "Name and password are required" });

    if (!validateInput(name, validationRules.username)) {
      return res.status(400).json({ Message: "Invalid username. Must be 3-20 alphanumeric characters." });
    }
    if (!validateInput(password, validationRules.password)) {
      return res.status(400).json({ Message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." });
    }

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    const existingUser = await collection.findOne({ name: sanitizedName });
    if (existingUser) return res.status(409).json({ Message: "User already exists" });

    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newDocument = { name: sanitizedName, password: hashedPassword, createdAt: new Date() };
    const result = await collection.insertOne(newDocument);

    res.status(201).json({ message: "Signup successful", userId: result.insertedId });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ Message: "Signup failed" });
  }
});

// LOGIN route
router.post("/login", loginLimiter, async (req, res) => {

// LOGIN ROUTE: APPLY LOGIN-SPECIFIC VALIDATION
router.post("/login", loginLimiter, validateLoginInput, async (req, res) => {
  const { name, password } = req.body;
  console.log(name + " " + password);

  try {
    const { name, password } = req.body;
    const collection = db.collection("users");
    // Name is clean due to validateLoginInput
    const user = await collection.findOne({ name }); 

    if (!validateInput(name, validationRules.username)) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    const user = await collection.findOne({ name: sanitizedName });

    if (!user) return res.status(401).json({ Message: "Authentication failed" });

    // Password comparison is done by bcrypt, which handles the secure hash check
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ Message: "Authentication failed" });

    // Create JWT token FIRST
    const expiresIn = 3600; // 1 hour
    const token = jwt.sign(
      { 
        name: user.name, 
        sessionId: null, // Will be filled after session creation
        iat: Math.floor(Date.now() / 1000) 
      },
      process.env.JWT_SECRET || "your_long_secret_key_change_this",
      { expiresIn }
    );

    // Decode to get proper token structure
    const decodedToken = jwt.decode(token);
    
    // Now create session with the token AND regenerate token with sessionId
    const clientIp = req.ip || req.connection.remoteAddress;
    console.log('Login - Client IP:', clientIp);
    
    const sessionId = createSession(clientIp, user.name, token);

    // Regenerate token with sessionId
    const finalToken = jwt.sign(
      { 
        name: user.name, 
        sessionId: sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || "your_long_secret_key_change_this",
      { expiresIn }
    );

    // Update session with final token
    const { activeSessions } = await import("../middleware/checkauth.mjs");
    if (activeSessions.has(sessionId)) {
      const session = activeSessions.get(sessionId);
      session.token = finalToken;
      activeSessions.set(sessionId, session);
    }

    if (!passwordMatch) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const token = jwt.sign({ name: user.name }, "this_secret_should_be_longer_than_it_is", { expiresIn: '1h' });

    res.status(200).json({
      message: "Authentication successful",
      name: user.name,
      token: finalToken,
      expiresIn
    });

    res.status(200).json({ 
      Message: "Authentication successful",
      token: token
    });
    
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ Message: "Login failed" });
  }
});

// LOGOUT route
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


// LOGOUT route
router.post("/logout", (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) destroySession(sessionId);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});


export default router;
