// backend/server.mjs

// Import route handlers
import posts from "./routes/post.mjs";
import users from "./routes/user.mjs";
import employees from "./routes/employee.mjs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import https from "https"; 
import fs from "fs";       
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';

// --- NEW IMPORTS: To create absolute paths for SSL keys ---
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// ============================================
//   Security Headers with Helmet
// ============================================
app.use(helmet({
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"], // Simplified: 'self' includes the same origin, so localhost:3000 is covered
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
// CORS Configuration
// ============================================
const corsOptions = {
  origin: [
    'http://localhost:3001', 'https://localhost:3001', 'http://127.0.0.1:3001', 'https://127.0.0.1:3001',
    'http://localhost:3002', 'https://localhost:3002', 'http://127.0.0.1:3002', 'https://127.0.0.1:3002',
    'http://localhost:5173', 'http://127.0.0.1:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// ============================================
// NoSQL Injection Protection
// ============================================
app.use(mongoSanitize({
  replaceWith: '_'
}));

// ============================================
// Additional Security Headers (These are good, but some are redundant with Helmet. Kept for explicit security)
// ============================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
});

// ============================================
// Rate Limiting
// ============================================
const employeeLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 3, 
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`🚨 Rate limit exceeded for employee login from IP: ${req.ip}`);
    res.status(429).json({ message: 'Too many login attempts. Please try again in 15 minutes.' });
  }
});
const generalEmployeeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests.' });

// ============================================
//   Input Sanitization
// ============================================
const sanitizeEmployeeInput = (req, res, next) => {
  if (req.body) {
    if (req.body.email) req.body.email = validator.normalizeEmail(req.body.email);
    if (req.body.name) req.body.name = validator.escape(req.body.name);
  }
  next();
};
app.use('/employee/login', employeeLoginLimiter);
app.use('/employee', generalEmployeeLimiter, sanitizeEmployeeInput);

// ============================================
// Route Handlers
// ============================================
app.use("/post", posts);
app.use("/user", users);
app.use("/employee", employees);

// ============================================
//  HTTPS Server Setup (FIXED WITH ABSOLUTE PATHS)
// ============================================

// Get the directory name of the current module (server.mjs)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct the full, absolute path to the SSL key files
const keyPath = path.join(__dirname, 'keys', 'privatekey.pem');
const certPath = path.join(__dirname, 'keys', 'certificate.pem');

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

const server = https.createServer(options, app);

server.listen(PORT, () => {
  console.log(`✓ Server started at https://localhost:${PORT}`);
  console.log(`✓ Employee Portal (Expected): http://localhost:3002`);
  console.log(`✓ Customer Portal (Expected): http://localhost:3001`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use!`);
    process.exit(1);
  }
  // Added robust error logging for the SSL key file issue
  else if (err.code === 'ENOENT') {
    console.error(`✗ FATAL ERROR: SSL key file not found.`);
    console.error(`  The server tried to read a key from this path: ${err.path}`);
    console.error(`  Please ensure the 'keys' folder and its .pem files are in the 'backend' directory.`);
    process.exit(1);
  }
  throw err;
});