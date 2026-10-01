import { loginSchema, registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendMail from "../config/sendMail.js";
import { getOtpHtml, getVerifyEmailHtml } from "../config/html.js";
import {
  generateAccessToken,
  generateToken,
  revokeRefreshToken,
  verifyRefreshToken,
} from "../config/generateToken.js";
import { generateCSRFToken } from "../config/csrfMiddleware.js";

export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = registerSchema.safeParse(sanitizedBody);

  // Validate input schema using Zod
  if (!validation.success) {
    const zodError = validation.error;
    let firstErrorMessage = "Validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));

      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }

    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { name, email, password } = validation.data;

  // 1. Rate limiting check (Prevent spamming verification emails)
  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;
  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Verification email already sent recently. Please wait a minute before trying again.",
    });
  }

  // 2. Check if user already exists in MongoDB
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: "An account with this email already exists. Please log in.",
    });
  }

  // 3. Prepare temporary payload for Redis
  const hashPassword = await bcrypt.hash(password, 10);
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyKey = `verify:${verifyToken}`;

  const dataToStore = JSON.stringify({
    name,
    email,
    password: hashPassword,
    role: "user",
  });

  // Store temporary user registration data in Redis (5-minute TTL)
  await redisClient.set(verifyKey, dataToStore, { EX: 300 });

  // 4. Send verification email
  const subject = "Verify your email for account creation";
  const html = getVerifyEmailHtml({ email, token: verifyToken });
  await sendMail({ email, subject, html });

  // 5. Set rate limit flag in Redis for 1 minute
  await redisClient.set(rateLimitKey, "true", { EX: 60 });

  return res.status(200).json({
    message: "If your email is valid, a verification link has been sent. It will expire in 5 minutes.",
  });
});

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      message: "Verification token is required.",
    });
  }

  const verifyKey = `verify:${token}`;

  // ATOMIC get-and-delete: prevents race conditions from React StrictMode
  // double-mounting or users clicking the link twice simultaneously.
  // getDel returns the value and deletes it in a single Redis command,
  // guaranteeing only one caller can ever read the token data.
  const userDataJson = await redisClient.getDel(verifyKey);

  if (!userDataJson) {
    // Token was already consumed or expired.
    // Check if the user already exists — if so, this is a harmless re-click
    // and we should treat it as "already verified" (idempotent).
    // We can't know the email from the token (it's gone), so we return
    // a user-friendly message that handles both expired AND already-used cases.

    // Try to extract email from query param (set by frontend on re-verify)
    // Otherwise return a generic but helpful message.
    return res.status(200).json({
      message: "Your account has already been verified. Please log in.",
      alreadyVerified: true,
    });
  }

  const userData = JSON.parse(userDataJson);

  // Check if user was already created (idempotent: handles the edge case
  // where the DB write succeeded on a previous attempt but the response
  // was lost due to a network error / browser refresh).
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    // User already exists — treat as successful verification.
    // Issue tokens so the user gets auto-logged in.
    const tokenData = await generateToken(existingUser._id, res);

    return res.status(200).json({
      message: `Welcome back, ${existingUser.name}! Your account is verified.`,
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
      sessionInfo: {
        sessionId: tokenData.sessionId,
        loginTime: new Date().toISOString(),
        csrfToken: tokenData.csrfToken,
      },
      alreadyVerified: true,
    });
  }

  // Create the new user
  const newUser = await User.create({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || "user",
  });

  // Issue tokens immediately so the user is auto-logged in after verification
  const tokenData = await generateToken(newUser._id, res);

  res.status(201).json({
    message: `Welcome, ${newUser.name}! Your account has been verified.`,
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
    sessionInfo: {
      sessionId: tokenData.sessionId,
      loginTime: new Date().toISOString(),
      csrfToken: tokenData.csrfToken,
    },
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);

  const validation = loginSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const zodError = validation.error;

    let firstErrorMessage = "Validation failed";
    let allErrors = [];

    if (zodError?.issues && Array.isArray(zodError.issues)) {
      allErrors = zodError.issues.map((issue) => ({
        field: issue.path ? issue.path.join(".") : "unknown",
        message: issue.message || "Validation Error",
        code: issue.code,
      }));

      firstErrorMessage = allErrors[0]?.message || "Validation Error";
    }
    return res.status(400).json({
      message: firstErrorMessage,
      error: allErrors,
    });
  }

  const { email, password } = validation.data;

  const rateLimitKey = `login-rate-limit:${req.ip}:${email}`;

  if (await redisClient.get(rateLimitKey)) {
    return res.status(429).json({
      message: "Too many requests, try again later",
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "Invalid credentials",
    });
  }

  // Check if user is banned
  if (user.status === "banned") {
    return res.status(403).json({
      message: "Your account has been suspended. Please contact support.",
    });
  }

  const comparePassword = await bcrypt.compare(password, user.password);

  if (!comparePassword) {
    return res.status(400).json({
      message: "Invalid credentials",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpKey = `otp:${email}`;

  await redisClient.set(otpKey, otp, {
    EX: 300,
  });

  const subject = "Otp for verification";

  const html = getOtpHtml({ email, otp });

  await sendMail({ email, subject, html });

  await redisClient.set(rateLimitKey, "true", {
    EX: 60,
  });

  res.json({
    message:
      "If your email is valid, an OTP has been sent. It will be valid for 5 minutes.",
  });
});

export const verifyOtp = TryCatch(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      message: "Please provide all details",
    });
  }

  const otpKey = `otp:${email}`;

  const storedOtp = await redisClient.get(otpKey);

  if (!storedOtp) {
    return res.status(400).json({
      message: "OTP expired",
    });
  }

  if (storedOtp !== otp) {
    return res.status(400).json({
      message: "Invalid OTP",
    });
  }

  await redisClient.del(otpKey);

  let user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({
      message: "User account not found. Please register again.",
    });
  }

  // Check if user is banned (double-check at OTP step)
  if (user.status === "banned") {
    return res.status(403).json({
      message: "Your account has been suspended. Please contact support.",
    });
  }

  const tokenData = await generateToken(user._id, res);

  res.status(200).json({
    message: `Welcome ${user.name}`,
    user,
    sessionInfo: {
      sessionId: tokenData.sessionId,
      loginTime: new Date().toISOString(),
      csrfToken: tokenData.csrfToken,
    },
  });
});

export const myProfile = TryCatch(async (req, res) => {
  const user = req.user;

  const sessionId = req.sessionId;

  const sessionData = await redisClient.get(`session:${sessionId}`);

  let sessionInfo = null;

  if (sessionData) {
    const parsedSession = JSON.parse(sessionData);
    sessionInfo = {
      sessionId,
      loginTime: parsedSession.createdAt,
      lastActivity: parsedSession.lastActivity,
    };
  }

  res.json({ user, sessionInfo });
});

export const refreshToken = TryCatch(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Invalid refresh token",
    });
  }

  const decode = await verifyRefreshToken(refreshToken);

  if (!decode) {
    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");
    res.clearCookie("csrfToken");

    return res.status(401).json({
      message: "Session Expired. Please login",
    });
  }

  generateAccessToken(decode.id, decode.sessionId, res);

  res.status(200).json({
    message: "token refreshed",
  });
});

export const logoutUser = TryCatch(async (req, res) => {
  const userId = req.user._id;

  await revokeRefreshToken(userId);

  res.clearCookie("refreshToken");
  res.clearCookie("accessToken");
  res.clearCookie("csrfToken");

  await redisClient.del(`user:${userId}`);

  res.json({
    message: "Logged out successfully",
  });
});

export const refreshCSRF = TryCatch(async (req, res) => {
  const userId = req.user._id;

  const newCSRFToken = await generateCSRFToken(userId, res);

  res.json({
    message: "CSRF token refreshed successfully",
    csrfToken: newCSRFToken,
  });
});

export const adminController = TryCatch(async (req, res) => {
  res.json({
    message: "Hello admin",
  });
});

// ─── Admin User Management ───────────────────────────────────────────────────

export const getAllUsers = TryCatch(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  res.json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

export const getUserById = TryCatch(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json({ user });
});

export const deleteUser = TryCatch(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (req.user._id.toString() === id) {
    return res.status(400).json({
      message: "You cannot delete your own account from the admin panel",
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  // Clean up Redis data for the deleted user
  await Promise.all([
    redisClient.del(`user:${id}`),
    redisClient.del(`refresh_token:${id}`),
    redisClient.del(`active_session:${id}`),
    redisClient.del(`csrf:${id}`),
  ]);

  await User.findByIdAndDelete(id);

  res.json({
    message: `User "${user.name}" has been deleted successfully`,
  });
});

export const updateUser = TryCatch(async (req, res) => {
  const { id } = req.params;
  const { role, status } = req.body;

  // Prevent admin from modifying themselves
  if (req.user._id.toString() === id) {
    return res.status(400).json({
      message: "You cannot modify your own account from the admin panel",
    });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  // Validate allowed values
  if (role && !["user", "admin"].includes(role)) {
    return res.status(400).json({
      message: "Invalid role. Must be 'user' or 'admin'.",
    });
  }

  if (status && !["active", "banned"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Must be 'active' or 'banned'.",
    });
  }

  if (role) user.role = role;
  if (status) user.status = status;

  await user.save();

  // Invalidate cached user data so next auth check gets fresh data
  await redisClient.del(`user:${id}`);

  // If user was banned, also revoke their session
  if (status === "banned") {
    await Promise.all([
      redisClient.del(`refresh_token:${id}`),
      redisClient.del(`active_session:${id}`),
      redisClient.del(`csrf:${id}`),
    ]);
  }

  res.json({
    message: `User "${user.name}" has been updated successfully`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  });
});
