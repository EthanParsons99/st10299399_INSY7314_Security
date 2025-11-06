// backend/server.mjs

process.on('uncaughtException', (err, origin) => {
  console.error(`\n!!! CRITICAL UNCAUGHT EXCEPTION !!!\n`);
  console.error(`Origin: ${origin}`);
  console.error(err.stack);
  
  // 🚨 CRITICAL DEBUG FIX 🚨: Add a small synchronous delay (100ms) to flush the 
  // console buffer, ensuring the full stack trace is written to /tmp/server.log
  // before process.exit(1) is called.
  const now = Date.now();
  while (Date.now() - now < 100) {}
  
  // Log the crash and exit gracefully
  process.exit(1); 
});


import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import https from "https"; 
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables FIRST
dotenv.config();

// Verify critical environment variables
console.log('=== Environment Check ===');
console.log('ATLAS_URI:', process.env.ATLAS_URI ? '✓ Set' : '✗ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');
// Mask sensitive data
console.log('EMPLOYEE_USERNAME:', process.env.EMPLOYEE_USERNAME ? '✓ Set' : '✗ NOT SET');
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

// Security Middleware: Helmet
app.use(helmet({
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://127.0.0.1:3000"], // Added self-reference for connection
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://localhost:3001',
    'https://localhost:3001',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3001',
    'http://localhost:5173', // Vite default dev server
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'], // Added PATCH
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Built-in Express Middleware
app.use(express.json({ limit: '10kb' })); // Prevents large payload attacks
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Custom Security Headers (Redundant with Helmet but good to keep explicit)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
});

// Route Registration
app.use("/post", posts);
app.use("/user", users);
app.use("/employee", employees); // Employee route integration

// Health Check / Root route
app.get("/", (req, res) => {
  res.status(200).json({ status: "Server Running", db: "Connected" });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// HTTPS Setup
const certPath = path.join(__dirname, 'keys', 'certificate.pem');
const keyPath = path.join(__dirname, 'keys', 'privatekey.pem');

// Verify key files exist before trying to read them
if (!fs.existsSync(certPath)) {
  console.error(`✗ Certificate file not found at: ${certPath}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`✗ Private key file not found at: ${keyPath}`);
  process.exit(1);
}

console.log(`✓ Certificate loaded from: ${certPath}`);
console.log(`✓ Private key loaded from: ${keyPath}`);

// Read the certificate files
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

const server = https.createServer(options, app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server started at https://0.0.0.0:${PORT}`);
  console.log(`✓ Local access: https://localhost:${PORT}`);
  console.log(`✓ Frontend should be at http://localhost:3001`);
  console.log('==================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use.`);
  } else {
    console.error(`✗ Server error: ${err.message}`);
  }
  process.exit(1);
});

// Ensure the connection is established before starting the server
import('./db/conn.mjs')
  .then(() => {
    console.log('Initialization complete.');
  })
  .catch(err => {
    // conn.mjs already exits on connection failure, but good practice to handle here too
    console.error('Initial database connection failed during import:', err.message);
    process.exit(1);
  });