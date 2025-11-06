// backend/server.mjs
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

// Middleware
app.use(helmet({
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

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

// Apply CORS middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
});

// Health check endpoint for CircleCI
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use("/post", posts);
app.use("/user", users);
app.use("/employee", employees);

// Certificate paths - always use keys/ folder
const certPath = path.join(__dirname, 'keys', 'certificate.pem');
const keyPath = path.join(__dirname, 'keys', 'privatekey.pem');

// Verify files exist
if (!fs.existsSync(certPath)) {
  console.error(`✗ Certificate file not found at: ${certPath}`);
  console.error(`Current directory: ${__dirname}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`✗ Private key file not found at: ${keyPath}`);
  console.error(`Current directory: ${__dirname}`);
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
  console.log(`✓ MongoDB: ${process.env.ATLAS_URI ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`✓ JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`✓ Employee User: ${process.env.EMPLOYEE_USERNAME || 'NOT CONFIGURED'}`);
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