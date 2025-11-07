import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.ATLAS_URI || ""; 

// Log connection status
if (connectionString) {
  console.log('✓ MongoDB connection string is configured');
} else {
  console.error('✗ ATLAS_URI environment variable is not set!');
  console.error('Please set ATLAS_URI in your environment or .env file');
  process.exit(1);
}

const client = new MongoClient(connectionString);

let conn;
let db;

// Attempt to connect to MongoDB
// Log success or failure
try {
  console.log('Connecting to MongoDB...');
  conn = await client.connect();
  console.log('✓ MongoDB is CONNECTED!');
} catch (e) {
  console.error('✗ MongoDB connection failed:', e.message);
  console.error('Make sure ATLAS_URI is correct and MongoDB cluster is accessible');
  process.exit(1);
}

db = client.db("users");

export default db;