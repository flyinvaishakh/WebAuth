import express from "express";
import {
  adminController,
  deleteUser,
  getAllUsers,
  getUserById,
  loginUser,
  logoutUser,
  myProfile,
  refreshCSRF,
  refreshToken,
  registerUser,
  updateUser,
  verifyOtp,
  verifyUser,
} from "../controllers/user.js";
import { authorizedAdmin, isAuth } from "../middlewares/isAuth.js";
import { verifyCSRFToken } from "../config/csrfMiddleware.js";

const router = express.Router();

// Public routes (no auth, no CSRF)
router.post("/register", registerUser);
router.post("/verify/:token", verifyUser);
router.post("/login", loginUser);
router.post("/verify", verifyOtp);
router.post("/refresh", refreshToken);

// Protected routes
router.get("/me", isAuth, myProfile);
router.post("/refresh-csrf", isAuth, refreshCSRF);
router.post("/logout", isAuth, verifyCSRFToken, logoutUser);
router.get("/admin", isAuth, authorizedAdmin, adminController);

// Admin user management routes
router.get("/admin/users", isAuth, authorizedAdmin, getAllUsers);
router.get("/admin/users/:id", isAuth, authorizedAdmin, getUserById);
router.delete("/admin/users/:id", isAuth, authorizedAdmin, verifyCSRFToken, deleteUser);
router.patch("/admin/users/:id", isAuth, authorizedAdmin, verifyCSRFToken, updateUser);

export default router;