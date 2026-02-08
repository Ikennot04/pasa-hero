import express from "express";
import upload from "../../middlewear/multer.js";
import { signupUser, loginUser } from "./user.controller.js";

const router = express.Router();

// auth routes
router.post("/signup", upload.single("image"), signupUser);
router.post("/signin", loginUser);

export default router;
