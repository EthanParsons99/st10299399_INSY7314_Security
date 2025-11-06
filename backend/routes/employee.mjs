// backend/routes/employee.mjs
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db/conn.mjs";
import checkAuth, { 
  createSession, 
  destroySession, 
  checkEmployeeRole,
  recordFailedLogin,
  isAccountLocked,
  clearLoginAttempts
} from "../middleware/checkauth.mjs";

const router = express.Router();

// Employee login with username (using environment variables)
router.post("/login", async (req, res) => {
  try {
    let { name, password } = req.body;

    // Input validation
    if (!name || !password) {
      return res.status(400).json({ message: "Username and password are required." });
    }

    // Sanitize username
    name = name.trim();

    // Check if account is locked
    if (isAccountLocked(name)) {
      console.warn(`Locked account login attempt: ${name}`);
      return res.status(429).json({ 
        message: "Account temporarily locked due to multiple failed attempts. Try again later." 
      });
    }

    // Check against environment variable credentials
    const envUsername = process.env.EMPLOYEE_USERNAME;
    const envPasswordHash = process.env.EMPLOYEE_PASSWORD;

    if (!envUsername || !envPasswordHash) {
      console.error("Employee credentials not configured in environment variables");
      return res.status(500).json({ message: "Server configuration error." });
    }

    // Check if username matches
    if (name !== envUsername) {
      recordFailedLogin(name);
      // Don't reveal whether username exists
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify password against the hashed password in .env
    const isPasswordValid = await bcrypt.compare(password, envPasswordHash);

    if (!isPasswordValid) {
      const attemptCount = recordFailedLogin(name);
      console.warn(`Failed login attempt ${attemptCount} for employee: ${name}`);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Clear failed attempts on successful login
    clearLoginAttempts(name);

    // Get client IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() 
      || req.ip 
      || req.connection.remoteAddress;

    // Create session first to get sessionId
    const sessionId = createSession(clientIp, name, '', 'employee');

    // Create JWT token with sessionId
    const token = jwt.sign(
      { 
        name: name,
        role: 'employee',
        sessionId
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" } // Shorter expiration for employees
    );

    // Update session with final token
    const { activeSessions } = await import("../middleware/checkauth.mjs");
    const session = activeSessions.get(sessionId);
    if (session) {
      session.token = token;
    }

    console.log(`✓ Employee login successful: ${name}`);

    res.status(200).json({
      token,
      user: {
        name: name,
        role: 'employee'
      }
    });

  } catch (error) {
    console.error("Employee login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// Get all payments/transactions (Protected route)
router.get("/payments", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    console.log(`✓ Employee ${req.userData.name} accessing payments`);
    
    const collection = db.collection("payments");
    const payments = await collection.find({}).sort({ createdAt: -1 }).toArray();
    
    console.log(`✓ Found ${payments.length} payment records`);
    
    // Return just the array
    res.status(200).json(payments);

  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ 
      message: "Failed to fetch payments",
      error: error.message 
    });
  }
});
// Get payment by ID (Protected route)
router.get("/payments/:id", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const collection = db.collection("payments");
    
    const payment = await collection.findOne({ 
      _id: new ObjectId(req.params.id) 
    });

    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: "Payment not found" 
      });
    }

    res.status(200).json({
      success: true,
      payment: payment
    });

  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch payment",
      error: error.message 
    });
  }
});
// Update payment status - Approve or Reject (Protected route)
router.patch("/payments/:id", checkAuth, checkEmployeeRole, async (req, res) => {
  try {
    const { ObjectId } = await import("mongodb");
    const { status } = req.body;
    
    // Validate status
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid status. Must be 'approved' or 'rejected'" 
      });
    }

    const collection = db.collection("payments");
    
    // Update the payment with new status and processing info
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          status: status,
          processedBy: req.userData.name,
          processedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Payment not found" 
      });
    }

    console.log(`✓ Payment ${req.params.id} ${status} by ${req.userData.name}`);

    res.status(200).json({
      success: true,
      message: `Payment ${status} successfully`,
      paymentId: req.params.id,
      status: status
    });

  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update payment status",
      error: error.message 
    });
  }
});
// Employee logout
router.post("/logout", checkAuth, checkEmployeeRole, (req, res) => {
  destroySession(req.userData.sessionId);
  res.status(200).json({ message: "Logged out successfully." });
});

// Protected employee dashboard
router.get("/dashboard", checkAuth, checkEmployeeRole, (req, res) => {
  res.status(200).json({ 
    message: "Employee dashboard",
    user: req.userData 
  });
});

export default router;