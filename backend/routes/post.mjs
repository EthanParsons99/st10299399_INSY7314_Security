// backend/routes/post.mjs

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import checkauth from "../middleware/checkauth.mjs"; 

const router = express.Router();

// REGEX PATTERNS FOR WHITELISTING 
const amountRegex = /^\d+(\.\d{1,2})?$/; // Positive number with up to 2 decimal places (e.g., 100, 100.00)
const currencyRegex = /^[A-Z]{3}$/; // Exactly 3 uppercase letters (e.g., USD, EUR)
const providerRegex = /^[a-zA-Z0-9\s-]{3,50}$/; // Alphanumeric, spaces, and hyphens, 3-50 chars
const accountRegex = /^\d{6,34}$/; // 6 to 34 digits (Covers most bank accounts)
const swiftRegex = /^[A-Z0-9]{8,11}$/; // 8 or 11 uppercase alphanumeric chars (SWIFT/BIC format)

//  INPUT VALIDATION MIDDLEWARE
const validatePaymentInput = (req, res, next) => {
  const paymentData = req.body;

  // Basic presence check
  if (
    !paymentData.amount ||
    !paymentData.currency ||
    !paymentData.provider ||
    !paymentData.recipientAccount ||
    !paymentData.swiftCode
  ) {
    return res.status(400).json({ message: "All payment fields are required." });
  }

  // Whitelisting checks
  if (!amountRegex.test(paymentData.amount.toString())) {
    return res.status(400).json({ message: "Invalid amount format. Must be a positive number with up to two decimal places." });
  }

  if (!currencyRegex.test(paymentData.currency)) {
    return res.status(400).json({ message: "Invalid currency format. Must be a 3-letter uppercase code (e.g., USD)." });
  }

  if (!providerRegex.test(paymentData.provider)) {
    return res.status(400).json({ message: "Invalid provider format. Use 3-50 alphanumeric characters, spaces, or hyphens." });
  }
  
  if (!accountRegex.test(paymentData.recipientAccount)) {
    return res.status(400).json({ message: "Invalid recipient account format. Must be 6-34 digits." });
  }

  if (!swiftRegex.test(paymentData.swiftCode)) {
    return res.status(400).json({ message: "Invalid swift code format. Must be 8 or 11 uppercase alphanumeric characters." });
  }

  next();
};

// CREATE a new payment. This route is PROTECTED and VALIDATED.
router.post("/", checkauth, validatePaymentInput, async (req, res) => {
  try {
    // Data is now whitelisted and safe to use
    const paymentData = req.body;
    const collection = db.collection("payments"); 

    const newPayment = {
      amount: parseFloat(paymentData.amount), // Ensure amount is stored as a number
      currency: paymentData.currency,
      provider: paymentData.provider,
      recipientAccount: paymentData.recipientAccount,
      swiftCode: paymentData.swiftCode,
      status: "pending", 
      owner: req.userData.name, 
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
        console.error("Error fetching payments:", error);
        res.status(500).json({ message: "Failed to retrieve payments." });
    }
});


export default router;