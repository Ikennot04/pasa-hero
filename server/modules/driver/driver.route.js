import express from "express";
import upload from "../../middlewear/multer.js";
import { createDriver } from "./driver.controller.js";

const router = express.Router();

router.post("/", upload.single("image"), createDriver);

export default router;
