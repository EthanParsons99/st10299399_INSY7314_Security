// backend/routes/post.mjs
import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import checkauth from "../middleware/checkauth.mjs"; // <-- Import the middleware

const router = express.Router();

// CREATE a new payment. This route is now PROTECTED by the checkauth middleware.
router.post("/", checkauth, async (req, res) => {
  try {
    // The checkauth middleware ran first. If it passed, we have req.userData.
    const paymentData = req.body;
    const collection = db.collection("payments"); // Let's use a "payments" collection

    const newPayment = {
      amount: paymentData.amount,
      currency: paymentData.currency,
      provider: paymentData.provider,
      recipientAccount: paymentData.recipientAccount,
      swiftCode: paymentData.swiftCode,
      status: "pending", // Default status for a new payment
      owner: req.userData.name, // Link the payment to the logged-in user
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newPayment);
    res.status(201).json({ message: "Payment created successfully", paymentId: result.insertedId });

  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ message: "Failed to create payment." });
  }
});

// GET all payments for the logged-in user. Also protected.
router.get("/", checkauth, async (req, res) => {
    try {
        const collection = db.collection("payments");
        // Find only payments that belong to the logged-in user
        const payments = await collection.find({ owner: req.userData.name }).toArray();
        res.status(200).json(payments);
    } catch (error) {
        console.error("Fetch payments error:", error);
        res.status(500).json({ message: "Failed to fetch payments." });
    }
});


export default router;