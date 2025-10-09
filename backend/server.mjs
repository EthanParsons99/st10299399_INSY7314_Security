import posts from "./routes/post.mjs";
import users from "./routes/user.mjs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import http from "http";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// PROTECTION 1: Use Helmet to set security headers
app.use(helmet({
  frameguard: {
    action: 'deny'
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
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

// PROTECTION 2: CORS configuration (accepts both HTTP and HTTPS for development)
const corsOptions = {
  origin: [
    'http://localhost:3001',
    'https://localhost:3001',
    'http://127.0.0.1:3001',
    'https://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// PROTECTION 3: Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// PROTECTION 4: Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});

app.use("/post", posts);
app.use("/user", users);

// Use HTTP for development (no SSL certificate needed)
const server = http.createServer(app);

console.log(`
╔════════════════════════════════════════╗
║  DEVELOPMENT SERVER (HTTP)             ║
║  🚀 Running on port ${PORT}             ║
║  🔓 NOT using SSL (development only)    ║
║  📝 For production, use HTTPS with SSL  ║
╚════════════════════════════════════════╝
`);

server.listen(PORT, () => {
  console.log(`✓ Server started at http://localhost:${PORT}`);
  console.log(`✓ Frontend should be at http://localhost:3001`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use!`);
    console.error('  Kill the process using this port or change PORT in .env');
    process.exit(1);
  }
  throw err;
});