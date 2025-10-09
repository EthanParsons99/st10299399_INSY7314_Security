import express from "express";
import db from "../db/conn.mjs";
import checkauth from "../middleware/checkauth.mjs";
import { validateInput, sanitizeInput, validationRules } from "../middleware/inputValidation.mjs";
import rateLimit from 'express-rate-limit';

const router = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many payment requests. Please slow down.',
});

router.post("/", checkauth, paymentLimiter, async (req, res) => {
  try {
    const { amount, currency, recipientAccount, swiftCode } = req.body;

    if (!validateInput(amount.toString(), validationRules.amount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!validateInput(currency, validationRules.currency)) {
      return res.status(400).json({ message: "Invalid currency" });
    }

    if (!validateInput(recipientAccount, validationRules.accountNumber)) {
      return res.status(400).json({ message: "Invalid account number" });
    }

    if (!validateInput(swiftCode, validationRules.swiftCode)) {
      return res.status(400).json({ message: "Invalid SWIFT code" });
    }

    const sanitizedAccount = sanitizeInput(recipientAccount);
    const sanitizedSwift = sanitizeInput(swiftCode);

    const collection = db.collection("payments");

    const newPayment = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      provider: 'SWIFT',
      recipientAccount: sanitizedAccount,
      swiftCode: sanitizedSwift,
      status: "pending",
      owner: req.userData.name,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(newPayment);

    res.status(201).json({ 
      message: "Payment created successfully", 
      paymentId: result.insertedId 
    });

  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ message: "Failed to create payment." });
  }
});

router.get("/", checkauth, async (req, res) => {
  try {
    const collection = db.collection("payments");
    const payments = await collection
      .find({ owner: req.userData.name })
      .toArray();

    res.status(200).json(payments);

  } catch (error) {
    console.error("Fetch payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments." });
  }
});

export default router;
