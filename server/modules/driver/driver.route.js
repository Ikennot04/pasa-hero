import express from "express";
import upload from "../../middlewear/multer.js";
import { getAllDrivers, getDriverById, createDriver } from "./driver.controller.js";

const router = express.Router();

router.get("/", getAllDrivers);
router.get("/:id", getDriverById);
router.post("/", upload.single("image"), createDriver);

export default router;
