// backend/routes/employee.mjs

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import checkauth, { checkEmployeeRole } from "../middleware/checkauth.mjs";

const router = express.Router();

// ROUTE 1: GET ALL PENDING PAYMENTS (This should already exist and be working)
router.get("/payments", checkauth, checkEmployeeRole, async (req, res) => {
  try {
    const collection = db.collection("payments");
    const pendingPayments = await collection.find({ status: "pending" }).sort({ createdAt: -1 }).toArray();
    res.status(200).json(pendingPayments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ message: "Failed to retrieve pending payments." });
  }
});


// --- NEW CODE START ---

// ROUTE 2: UPDATE A PAYMENT'S STATUS (APPROVE/REJECT)
// This is the endpoint that handles the button clicks.
router.patch("/payments/:id", checkauth, checkEmployeeRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Security Validation 1: Ensure the status is one of the allowed values
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: "Invalid status update provided." });
    }

    // Security Validation 2: Ensure the ID is a valid MongoDB ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid payment ID format." });
    }

    const collection = db.collection("payments");
    const result = await collection.updateOne(
      { _id: new ObjectId(id) }, // Find the document by its unique _id
      { 
        $set: { 
          status: status, 
          processedAt: new Date(),            // Log the time of processing
          processedBy: req.userData.name      // Log which employee processed it
        } 
      }
    );

    // Check if a document was actually found and modified
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Payment not found or status was already updated." });
    }

    res.status(200).json({ message: `Payment successfully updated to ${status}.` });

  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ message: "Failed to update payment status." });
  }
});

// --- NEW CODE END ---


export default router;