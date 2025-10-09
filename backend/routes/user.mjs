import express from "express";
import db from "../db/conn.mjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from 'express-rate-limit';
import { validateInput, sanitizeInput, validationRules } from "../middleware/inputValidation.mjs";
import { createSession, destroySession } from "../middleware/checkauth.mjs";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, 
  max: 5, 
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts. Please try again after 2 minutes.',
  skip: (req, res) => {
    // Skip rate limiting for localhost in development
    return process.env.NODE_ENV === 'development' && req.ip === '::1';
  }
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many signup attempts. Please try again later.',
});

router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ Message: "Name and password are required" });
    }

    if (!validateInput(name, validationRules.username)) {
      return res.status(400).json({ 
        Message: "Invalid username. Must be 3-20 alphanumeric characters." 
      });
    }

    if (!validateInput(password, validationRules.password)) {
      return res.status(400).json({ 
        Message: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." 
      });
    }

    const sanitizedName = sanitizeInput(name);

    const collection = db.collection("users");
    const existingUser = await collection.findOne({ name: sanitizedName });
    if (existingUser) {
      return res.status(409).json({ Message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDocument = {
      name: sanitizedName,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await collection.insertOne(newDocument);

    res.status(201).json({ message: "Signup successful", userId: result.insertedId });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ Message: "Signup failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!validateInput(name, validationRules.username)) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const sanitizedName = sanitizeInput(name);
    const collection = db.collection("users");
    const user = await collection.findOne({ name: sanitizedName });

    if (!user) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const sessionId = createSession(req.ip || req.connection.remoteAddress, name);
    const expiresIn = 3600;

    const token = jwt.sign(
      { 
        name: user.name,
        sessionId: sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || "your_long_secret_key_change_this",
      { expiresIn }
    );

    res.status(200).json({
      message: "Authentication successful",
      name: user.name,
      token: token,
      expiresIn: expiresIn
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ Message: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  try {
    const sessionId = req.body.sessionId;
    if (sessionId) {
      destroySession(sessionId);
    }
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;
