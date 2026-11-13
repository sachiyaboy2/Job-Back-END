import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { rateLimit } from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDatabase, databaseState, disconnectDatabase } from "./src/config/db.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { notFound } from "./src/middleware/notFound.js";
import { ensureUploadDir } from "./src/middleware/upload.js";
import apiRoutes from "./src/routes/index.js";

const app = express();
app.set("trust proxy", 1);

// ------------------------------------------------------------------ helmet
// cross-origin resource policy so the browser can fetch a streamed CV.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// -------------------------------------------------------------------- CORS
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: curl, Postman, server to server.
      if (!origin) return callback(null, true);
      if (env.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------------------------------------------------------- body
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ------------------------------------------------------------------ logging
app.use(env.isProduction ? morgan("combined") : morgan("dev"));

// ------------------------------------------------------------ rate limiting
// A generous ceiling for the whole API. The auth routes have their own, much
// tighter limiter (10 attempts per 15 minutes per IP).
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please wait a few minutes and try again.",
      error: { message: "Too many requests. Please wait a few minutes and try again.", statusCode: 429 },
    },
  })
);

// ------------------------------------------------------------------ health
app.get("/api/health", (_req, res) => {
  const database = databaseState();
  res.status(200).json({
    success: true,
    status: "ok",
    database: database === "connected" ? "connected" : "disconnected",
    uptime: process.uptime(),
  });
});

// ------------------------------------------------------------------ routes
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

/**
 * Start listening. Kept separate from the module body so the app can be
 * imported (by the verification script) without opening a port.
 */
export function startServer(port = env.port) {
  ensureUploadDir();

  const server = app.listen(port, () => {
    console.log(`[server] Jobelza API running on http://localhost:${port}`);
    console.log(`[server] Environment    : ${env.nodeEnv}`);
    console.log(`[server] Health check   : http://localhost:${port}/api/health`);
    console.log(`[server] Allowed origins: ${env.clientOrigins.join(", ")}`);
    console.log(`[server] Database       : ${databaseState()}`);
    console.log(`[server] Upload folder  : ${ensureUploadDir()}`);
  });

  async function shutdown(signal) {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log("[server] Shutdown complete.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    console.error("[server] Unhandled rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[server] Uncaught exception:", error);
    shutdown("uncaughtException");
  });

  return server;
}

// Only boot when this file is the program entry point.
const isEntryPoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntryPoint) {
  // A missing database must not stop the process from serving the API.
  await connectDatabase();
  startServer();
}

export default app;
