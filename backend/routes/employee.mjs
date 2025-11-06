// backend/routes/employee.mjs

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import checkauth, { checkEmployeeRole } from "../middleware/checkauth.mjs";

const router = express.Router();

// ROUTE 1: FETCH PENDING PAYMENTS
router.get("/payments", checkauth, checkEmployeeRole, async (req, res) => {
    try {
      const paymentsCollection = db.collection("payments");
  
      // Aggregation pipeline to join 'payments' with 'users'
      const pipeline = [
        {
          // Step 1: Find all pending payments
          $match: { status: "pending" }
        },
        {
          // Step 2: Perform a left join to the 'users' collection
          $lookup: {
            from: "users", // The collection to join with
            localField: "owner", // The field from the 'payments' collection
            foreignField: "name", // The field from the 'users' collection
            as: "userDetails" // The name for the new array field
          }
        },
        {
          // Step 3: Deconstruct the 'userDetails' array
          $unwind: {
            path: "$userDetails",
            preserveNullAndEmptyArrays: true // Keep payments even if user is not found
          }
        },
        {
          // Step 4: Reshape the output document
          $project: {
            // Keep all original payment fields
            _id: 1,
            amount: 1,
            currency: 1,
            provider: 1,
            recipientAccount: 1,
            swiftCode: 1,
            status: 1,
            owner: 1,
            createdAt: 1,
            // Add the accountNumber from the joined user document
            customerAccountNumber: "$userDetails.accountNumber" 
          }
        },
        {
          // Step 5: Sort by newest first
          $sort: { createdAt: -1 }
        }
      ];
  
      const pendingPaymentsWithDetails = await paymentsCollection.aggregate(pipeline).toArray();
      res.status(200).json(pendingPaymentsWithDetails);
  
    } catch (error) {
      console.error("Error fetching pending payments:", error);
      res.status(500).json({ message: "Failed to retrieve pending payments." });
    }
  });



// ROUTE 2: UPDATE A PAYMENT'S STATUS (APPROVE/REJECT)
// This is the endpoint that handles the button clicks from the employee dashboard
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


export default router;