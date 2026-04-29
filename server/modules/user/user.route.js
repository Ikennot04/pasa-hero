import express from "express";
import upload from "../../middlewear/multer.js";
import {
  signupUser,
  signInUser,
  checkJwtAuth,
  logoutUser,
  getUserById,
  getAllUsers,
  getOperatorsByAssignedTerminal,
  createAdminUser,
  updateUser,
} from "./user.controller.js";

const router = express.Router();

// auth routes (user side)
router.post("/auth/signup", upload.single("image"), signupUser);
router.post("/auth/signin", signInUser);
router.get("/auth/check", checkJwtAuth);
router.patch("/auth/logout/:id", logoutUser);

// can used for user and admin both
router.get("/auth/:id", getUserById); // get user by id
router.patch("/:id", upload.single("image"), updateUser);

// User Management Routes
router.get("/", getAllUsers);
router.get("/operators/terminal/:terminalId", getOperatorsByAssignedTerminal);
router.post("/", upload.single("image"), createAdminUser);

export default router;
