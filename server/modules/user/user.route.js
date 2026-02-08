import express from "express";
import upload from "../../middlewear/multer.js";
import { signupUser } from "./user.controller.js";

const router = express.Router();

// auth routes
router.post("/signup", upload.single("image"), signupUser);

export default router;
