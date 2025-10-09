import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.ATLAS_URI || ""; 
console.log(connectionString);

const client = new MongoClient(connectionString);

let conn;
let db;

try {
  conn = await client.connect();
  console.log('mongoDB is CONNECTED!!! :)');
} catch (e) {
  console.error(e);
}

db = client.db("users");

export default db;