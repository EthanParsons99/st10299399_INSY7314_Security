import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import checkauth from "../middleware/checkauth.mjs";
import { 
  validatePaymentData,
  sanitizeObject,
  checkForDangerousPatterns,
  isValidObjectId
} from "../middleware/inputValidation.mjs";

const router = express.Router();


// ENHANCED PAYMENT VALIDATION MIDDLEWARE

const validatePaymentInput = (req, res, next) => {
  // First, check for dangerous patterns in the entire request body
  const bodyString = JSON.stringify(req.body);
  const dangerCheck = checkForDangerousPatterns(bodyString);
  
  if (!dangerCheck.safe) {
    console.warn(`Security threat detected: ${dangerCheck.threat}`);
    return res.status(400).json({ 
      message: "Invalid input detected. Request rejected for security reasons." 
    });
  }

  // Use the comprehensive validation function
  const validation = validatePaymentData(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({ 
      message: "Payment validation failed", 
      errors: validation.errors 
    });
  }

  // Sanitize the body as an additional layer of protection
  req.body = sanitizeObject(req.body);
  
  next();
};


// CREATE PAYMENT (PROTECTED & VALIDATED)

router.post("/", checkauth, validatePaymentInput, async (req, res) => {
  try {
    const paymentData = req.body;
    const collection = db.collection("payments");

    // Additional server-side validation
    const amount = parseFloat(paymentData.amount);
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount: must be a positive number" });
    }

    if (amount > 1000000) {
      return res.status(400).json({ message: "Amount exceeds maximum limit" });
    }

    const newPayment = {
      amount: amount,
      currency: paymentData.currency.toUpperCase(),
      provider: paymentData.provider,
      recipientAccount: paymentData.recipientAccount,
      swiftCode: paymentData.swiftCode.toUpperCase(),
      status: "pending",
      owner: req.userData.name, // From authenticated session
      createdAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress, // Log IP for audit trail
    };

    const result = await collection.insertOne(newPayment);
    
    console.log(`Payment created: ${result.insertedId} by user: ${req.userData.name}`);
    
    res.status(201).json({ 
      message: "Payment created successfully", 
      paymentId: result.insertedId 
    });

  } catch (error) {
    console.error("Payment creation error:", error);
    res.status(500).json({ message: "Failed to create payment" });
  }
});


// GET ALL PAYMENTS FOR LOGGED-IN USER

router.get("/", checkauth, async (req, res) => {
  try {
    // Validate and sanitize query parameters
    const { status, limit, skip } = req.query;
    
    const query = { owner: req.userData.name };
    
    // Add optional status filter with validation
    if (status) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }
      query.status = status;
    }

    const collection = db.collection("payments");
    
    // Pagination with validation
    const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100 results
    const skipNum = Math.max(parseInt(skip) || 0, 0);

    const payments = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .toArray();

    res.status(200).json({
      payments,
      count: payments.length,
      limit: limitNum,
      skip: skipNum
    });

  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ message: "Failed to retrieve payments" });
  }
});


// GET SINGLE PAYMENT BY ID

router.get("/:id", checkauth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment ID format" });
    }

    const collection = db.collection("payments");
    const payment = await collection.findOne({ 
      _id: new ObjectId(id),
      owner: req.userData.name // Ensure user can only access their own payments
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.status(200).json(payment);

  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ message: "Failed to retrieve payment" });
  }
});


// DELETE PAYMENT (ONLY IF PENDING)

router.delete("/:id", checkauth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid payment ID format" });
    }

    const collection = db.collection("payments");
    
    // First, check if payment exists and belongs to user
    const payment = await collection.findOne({ 
      _id: new ObjectId(id),
      owner: req.userData.name 
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Only allow deletion of pending payments
    if (payment.status !== 'pending') {
      return res.status(403).json({ 
        message: "Cannot delete a payment that has already been processed" 
      });
    }

    const result = await collection.deleteOne({ 
      _id: new ObjectId(id),
      owner: req.userData.name 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    console.log(`Payment deleted: ${id} by user: ${req.userData.name}`);
    
    res.status(200).json({ message: "Payment deleted successfully" });

  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ message: "Failed to delete payment" });
  }
});

export default router;