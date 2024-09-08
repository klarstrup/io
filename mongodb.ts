// This approach is taken from https://github.com/vercel/next.js/tree/canary/examples/with-mongodb
import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI
  ? `mongodb+srv://${
      process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD
        ? `${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@`
        : ""
    }${process.env.MONGODB_URI}`
  : "mongodb://127.0.0.1:27017/test";

if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}
const options: MongoClientOptions = {};

let client: MongoClient;
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  client = global._mongoClient ||= new MongoClient(uri, options);
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
export { client as mongoClient };
