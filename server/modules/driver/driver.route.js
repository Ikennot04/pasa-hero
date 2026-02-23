import express from "express";
import upload from "../../middlewear/multer.js";
import {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriverById,
  softDeleteDriver,
} from "./driver.controller.js";

const router = express.Router();

router.get("/", getAllDrivers);
router.get("/:id", getDriverById);
router.post("/", upload.single("image"), createDriver);
router.patch("/:id", upload.single("image"), updateDriverById);
router.delete("/:id", softDeleteDriver);

export default router;
