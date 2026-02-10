import express from "express";
import { getAllTerminals } from "./terminal.controller.js";

const router = express.Router();

router.get('/', getAllTerminals);

export default router;  