import express from "express";
import upload from "../../middlewear/multer.js";
import { getAllDrivers, createDriver } from "./driver.controller.js";

const router = express.Router();

router.get("/", getAllDrivers);
router.post("/", upload.single("image"), createDriver);

export default router;
