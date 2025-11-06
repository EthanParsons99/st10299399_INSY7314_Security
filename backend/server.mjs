// backend/server.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import https from "https"; 
import fs from "fs";       
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';

// Load environment variables FIRST
dotenv.config();

// Verify critical environment variables
console.log('=== Environment Check ===');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? '✓ Set' : '✗ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');
console.log('EMPLOYEE_USERNAME:', process.env.EMPLOYEE_USERNAME || '✗ NOT SET');
console.log('EMPLOYEE_PASSWORD:', process.env.EMPLOYEE_PASSWORD ? '✓ Set' : '✗ NOT SET');
console.log('========================');

// Import route handlers (these may connect to DB)
import posts from "./routes/post.mjs";
import users from "./routes/user.mjs";
import employees from "./routes/employee.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();

// ============================================
// STEP 1: Body Parsers (MUST BE FIRST!)
// ============================================
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// ============================================
// STEP 2: Security Headers (Helmet)
// ============================================
app.use(helmet({
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://localhost:3000"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true
}));

// ============================================
// STEP 3: CORS Configuration
// ============================================
const corsOptions = {
  origin: [
    // Customer Portal Ports
    'http://localhost:3001',
    'https://localhost:3001',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3001',
    
    // Employee Portal Ports
    'http://localhost:3002',
    'https://localhost:3002',
    'http://127.0.0.1:3002',
    'https://127.0.0.1:3002',
    
    // Other common dev ports
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ============================================
// STEP 4: NoSQL Injection Protection (FIXED!)
// ============================================
// Only sanitize req.body, not req.query or req.params
app.use((req, res, next) => {
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body, {
      replaceWith: '_'
    });
  }
  next();
});

// ============================================
// STEP 5: Additional Security Headers
// ============================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
});

// ============================================
// STEP 6: Rate Limiting
// ============================================
const employeeLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit exceeded for employee login from IP: ${req.ip}`);
    res.status(429).json({
      message: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
});

const generalEmployeeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.'
});

// ============================================
// STEP 7: Custom Input Sanitization
// ============================================
const sanitizeEmployeeInput = (req, res, next) => {
  // Only sanitize if req.body exists and has the properties
  if (req.body) {
    if (req.body.email) {
      req.body.email = validator.normalizeEmail(req.body.email);
    }
    if (req.body.name) {
      req.body.name = validator.escape(req.body.name);
    }
  }
  next();
};

// Apply specific middleware to employee routes
app.use('/employee/login', employeeLoginLimiter);
app.use('/employee', generalEmployeeLimiter, sanitizeEmployeeInput);

// ============================================
// STEP 8: Route Handlers
// ============================================
app.use("/post", posts);
app.use("/user", users);
app.use("/employee", employees);

// ============================================
// STEP 9: HTTPS Server Setup
// ============================================
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

const server = https.createServer(options, app);

server.listen(PORT, () => {
  console.log(`✓ Server started at https://localhost:${PORT}`);
  console.log(`✓ Employee Portal: https://localhost:3002`);
  console.log(`✓ Customer Portal: https://localhost:3001`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use!`);
    process.exit(1);
  }
  console.error('✗ Server error:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});