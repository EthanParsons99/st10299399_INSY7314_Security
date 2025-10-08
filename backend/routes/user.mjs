// backend/routes/user.mjs (Revised)

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from 'express-rate-limit'; 

const router = express.Router();

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
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newDocument = {
      name: name, 
      password: hashedPassword
    };

    const collection = db.collection("users");
    const result = await collection.insertOne(newDocument);
    
    res.status(201).json({ result });
    
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ Message: "Signup failed" });
  }
});


// LOGIN ROUTE: APPLY LOGIN-SPECIFIC VALIDATION
router.post("/login", loginLimiter, validateLoginInput, async (req, res) => {
  const { name, password } = req.body;
  console.log(name + " " + password);

  try {
    const collection = db.collection("users");
    // Name is clean due to validateLoginInput
    const user = await collection.findOne({ name }); 

    if (!user) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    // Password comparison is done by bcrypt, which handles the secure hash check
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const token = jwt.sign({ name: user.name }, "this_secret_should_be_longer_than_it_is", { expiresIn: '1h' });

    res.status(200).json({ 
      Message: "Authentication successful",
      token: token
    });
    
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ Message: "Login failed" });
  }
});


export default router;