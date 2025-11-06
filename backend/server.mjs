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

dotenv.config();

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


app.use("/post", posts);
app.use("/user", users);
app.use("/employee", employees);

// This section sets up the HTTPS server using your SSL keys
const options = {
  key: fs.readFileSync('keys/privatekey.pem'),
  cert: fs.readFileSync('keys/certificate.pem')
};

const server = https.createServer(options, app);


server.listen(PORT, () => {
  console.log(`✓ Server started at https://localhost:${PORT}`);
  console.log(`✓ Frontend should be at http://localhost:3001`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use!`);
    process.exit(1);
  }
  throw err;
});