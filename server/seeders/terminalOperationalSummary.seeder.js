/**
 * Seeds TerminalLog rows and BusAssignment ETAs for testing
 * GET /api/terminals/:id/operational-summary?date=YYYY-MM-DD (UTC day used when seed runs)
 *
 * Prerequisite: run `npm run seed` first (allSchema.seeder.js).
 * Then: `npm run seed:operational-summary`
 *
 * Implementation: `seedOperationalSummaryDemo` in ./allSchema.seeder.js
 * (single source of truth with the full DB seed).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { seedOperationalSummaryDemo } from "./allSchema.seeder.js";

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  if (!process.env.MONGO_DB_URI) {
    console.error(
      "❌ Missing MONGO_DB_URI. Ensure server/.env exists (see allSchema seeder).",
    );
    process.exit(1);
  }

  mongoose
    .connect(process.env.MONGO_DB_URI)
    .then(() => {
      console.log("📦 Connected to MongoDB");
      return seedOperationalSummaryDemo();
    })
    .then(() => {
      console.log("🎉 Operational summary seed complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("💥 Seed failed:", err.message);
      process.exit(1);
    });
}

export default seedOperationalSummaryDemo;
