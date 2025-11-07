// backend/routes/employee.mjs
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb"; 
import checkAuth, { 
  createSession, 
  destroySession, 
  checkEmployeeRole,
  recordFailedLogin,
  isAccountLocked,
  clearLoginAttempts
} from "../middleware/checkauth.mjs";

const router = express.Router();

// Employee login 
router.post("/login", async (req, res) => {
  try {
    let { name, password } = req.body;
    if (!name || !password) return res.status(400).json({ message: "Username and password are required." });
    name = name.trim();
    if (isAccountLocked(name)) return res.status(429).json({ message: "Account temporarily locked." });

    const envUsername = process.env.EMPLOYEE_USERNAME;
    const envPasswordHash = process.env.EMPLOYEE_PASSWORD;
    if (!envUsername || !envPasswordHash) return res.status(500).json({ message: "Server configuration error." });
    if (name !== envUsername) { recordFailedLogin(name); return res.status(401).json({ message: "Invalid credentials." }); }

    const isPasswordValid = await bcrypt.compare(password, envPasswordHash);
    if (!isPasswordValid) { recordFailedLogin(name); return res.status(401).json({ message: "Invalid credentials." }); }

    clearLoginAttempts(name);
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.connection.remoteAddress;
    const sessionId = createSession(clientIp, name, '', 'employee');
    const token = jwt.sign({ name, role: 'employee', sessionId }, process.env.JWT_SECRET, { expiresIn: "2h" });
    
    const { activeSessions } = await import("../middleware/checkauth.mjs");
    const session = activeSessions.get(sessionId);
    if (session) session.token = token;

    res.status(200).json({ token, user: { name, role: 'employee' } });

  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});


// Fetch pending payments - Employee only
router.get("/payments", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    console.log(`✓ Employee ${req.userData.name} accessing payments`);
    
    const collection = db.collection("payments");
    
    // This pipeline correctly fetches ONLY pending payments AND joins the user's account number.
    const pipeline = [
      { $match: { status: "pending" } },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "name",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1, amount: 1, currency: 1, provider: 1, recipientAccount: 1, 
          swiftCode: 1, status: 1, owner: 1, createdAt: 1,
          customerAccountNumber: "$userDetails.accountNumber"
        }
      },
      { $sort: { createdAt: -1 } }
    ];

    const payments = await collection.aggregate(pipeline).toArray();
    
    console.log(`✓ Found ${payments.length} pending payment records`);
    res.status(200).json(payments);

  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ 
      message: "Failed to fetch payments",
      error: error.message 
    });
  }
});


// Get payment by ID 
router.get("/payments/:id", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    const collection = db.collection("payments");
    const payment = await collection.findOne({ _id: new ObjectId(req.params.id) });

    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

    res.status(200).json({ success: true, payment: payment });

  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payment", error: error.message });
  }
});


// Update payment status (approve/reject)
router.patch("/payments/:id", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be 'approved' or 'rejected'" });
    }

    const collection = db.collection("payments");
    
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: status, processedBy: req.userData.name, processedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "Payment not found or already processed" });
    }

    console.log(`✓ Payment ${req.params.id} ${status} by ${req.userData.name}`);

    res.status(200).json({
      success: true,
      message: `Payment ${status} successfully`,
    });

  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ success: false, message: "Failed to update payment status", error: error.message });
  }
});


// Employee logout & dashboard
router.post("/logout", checkAuth, checkEmployeeRole, (req, res) => {
  destroySession(req.userData.sessionId);
  res.status(200).json({ message: "Logged out successfully." });
});
router.get("/dashboard", checkAuth, checkEmployeeRole, (req, res) => {
  res.status(200).json({ message: "Employee dashboard", user: req.userData });
});

export default router;