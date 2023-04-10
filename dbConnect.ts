import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI
  ? `mongodb+srv://${
      process.env.MONGODB_USERNAME
        ? `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`
        : ""
    }${process.env.MONGODB_URI}`
  : "mongodb://127.0.0.1:27017/test";

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached: {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
} = global.mongoose;

if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
