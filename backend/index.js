import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createClient } from "redis";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();

await connectDb();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.log("Missing redis url");
  process.exit(1);
}

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Retry attempt: ${retries}`);
      return Math.min(retries * 100, 3000);
    },
  },
});

// Event handlers
redisClient.on("connect", () => {
  console.log("Connecting to Redis...");
});

redisClient.on("ready", () => {
  console.log("Redis is ready.");
});

redisClient.on("reconnecting", () => {
  console.log("Reconnecting to Redis...");
});

redisClient.on("end", () => {
  console.log("Redis connection closed.");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

try {
  await redisClient.connect();
  console.log("Connected to Redis");
} catch (err) {
  console.error("Failed to connect to Redis:", err);
}

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "x-xsrf-token",
      "csrf-token",
    ],
  })
);

app.use(express.json());
app.use(cookieParser());

import userRoutes from "./routes/user.js";

app.use("/api/v1", userRoutes);

const PORT = process.env.PORT || 5000;

const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});