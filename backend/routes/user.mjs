// backend/routes/user.mjs

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from 'express-rate-limit'; // <-- 1. IMPORT THE NEW PACKAGE

const router = express.Router();

// 2. REMOVE THE OLD ExpressBrute CODE
// var store = new ExpressBrute.MemoryStore();
// var bruteForce = new ExpressBrute(store);

// 3. ADD THE NEW RATE LIMITER CONFIGURATION
// This will limit login attempts to 10 requests per 15 minutes for each IP address
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
});


// This route does not need rate limiting
router.post("/signup", async (req, res) => {
  try {
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ Message: "Name and password are required" });
    }
    
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


// 4. APPLY THE NEW LIMITER TO THE LOGIN ROUTE
router.post("/login", loginLimiter, async (req, res) => {
  const { name, password } = req.body;
  console.log(name + " " + password);

  try {
    const collection = db.collection("users");
    const user = await collection.findOne({ name }); 

    if (!user) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ Message: "Authentication failed" });
    }

    const token = jwt.sign({ name: user.name }, "this_secret_should_be_longer_than_it_is", { expiresIn: "1H" });

    res.status(200).json({ Message: "Authentication successful", name: user.name, token: token });
    console.log("Your new token is", token);

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ Message: "Login failed" });
  }
});

export default router;