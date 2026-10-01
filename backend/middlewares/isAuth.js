import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import { User } from "../models/User.js";
import { isSessionActive } from "../config/generateToken.js";

const isProduction = process.env.NODE_ENV === "production";

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
};

export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        message: "Please login - no token provided",
      });
    }

    let decodedData;
    try {
      decodedData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        message: "Session expired or invalid token",
        code: jwtError.name,
      });
    }

    const sessionActive = await isSessionActive(
      decodedData.id,
      decodedData.sessionId
    );

    if (!sessionActive) {
      // Pass matching cookie options so browsers properly clear the cookies
      res.clearCookie("refreshToken", clearCookieOptions);
      res.clearCookie("accessToken", clearCookieOptions);
      res.clearCookie("csrfToken", {
        ...clearCookieOptions,
        httpOnly: false,
      });

      return res.status(401).json({
        message: "Session Expired. You have been logged in from another device",
      });
    }

    const cacheUser = await redisClient.get(`user:${decodedData.id}`);

    if (cacheUser) {
      req.user = JSON.parse(cacheUser);
      req.sessionId = decodedData.sessionId;
      return next();
    }

    const user = await User.findById(decodedData.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account no longer exists",
      });
    }

    await redisClient.setEx(`user:${user._id}`, 3600, JSON.stringify(user));

    req.user = user;
    req.sessionId = decodedData.sessionId;
    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const authorizedAdmin = async (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== "admin") {
    return res.status(403).json({
      message: "You are not authorized to perform this action",
    });
  }

  next();
};