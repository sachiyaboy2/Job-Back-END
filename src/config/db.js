import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDatabase() {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[db] Connected to MongoDB at ${redact(env.mongoUri)}`);

    mongoose.connection.on("error", (error) => {
      console.error("[db] MongoDB connection error:", error.message);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn(
        "[db] MongoDB disconnected. The API is running in degraded mode.",
      );
    });

    return mongoose.connection;
  } catch (error) {
    console.error("");
    console.error("  [db] WARNING: could not connect to MongoDB.");
    console.error(`  [db] URI attempted : ${redact(env.mongoUri)}`);
    console.error(`  [db] Reason       : ${error.message}`);
    console.error(
      "  [db] The API keeps running; database routes answer 503 until MongoDB is up.",
    );
    console.error(
      "  [db] Local mongod:  mongod.exe --dbpath <data> --port 27017 --bind_ip 127.0.0.1",
    );
    console.error(
      "  [db] Atlas       :  put the mongodb+srv:// string in .env as MONGODB_URI and restart.",
    );
    console.error("");
    return null;
  }
}

/** "connected" | "disconnected" | "connecting" | "disconnecting" */
export function databaseState() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return states[mongoose.connection.readyState] || "unknown";
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[db] MongoDB connection closed.");
  }
}

function redact(uri) {
  return String(uri).replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

export default connectDatabase;
