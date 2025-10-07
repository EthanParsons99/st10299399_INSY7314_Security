import express, { request, response, Router } from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ExpressBrute from "express-brute";

const router = express.Router();

var store = new ExpressBrute.MemoryStore();
var bruteForce = new ExpressBrute(store);

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

router.post("/login", bruteForce.prevent, async (req, res) => {
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