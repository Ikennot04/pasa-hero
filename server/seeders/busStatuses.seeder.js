import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Bus from "../modules/bus/bus.model.js";
import BusStatus from "../modules/bus_status/bus_status.model.js";

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_DB_URI) {
    throw new Error(
      "Missing MONGO_DB_URI. Ensure server/.env exists and is loaded.",
    );
  }
  await mongoose.connect(process.env.MONGO_DB_URI);
  console.log("📦 Connected to MongoDB");
}

function getOccupancyStatus(occupancyCount, capacity) {
  const ratio = capacity > 0 ? occupancyCount / capacity : 0;
  if (ratio >= 1) return "full";
  if (ratio >= 0.7) return "standing room";
  if (ratio >= 0.3) return "few seats";
  return "empty";
}

function busStatusRowForBus(bus, index) {
  if (bus.status === "out of service" || bus.status === "maintenance") {
    return {
      bus_id: String(bus._id),
      occupancy_count: 0,
      occupancy_status: "empty",
    };
  }
  const occupancyCount = Math.min(
    bus.capacity,
    Math.floor((bus.capacity * ((index % 5) + 1)) / 5),
  );
  return {
    bus_id: String(bus._id),
    occupancy_count: occupancyCount,
    occupancy_status: getOccupancyStatus(occupancyCount, bus.capacity),
  };
}

const seedBusStatuses = async () => {
  try {
    await ensureDbConnected();

    const buses = await Bus.find({ is_deleted: false }).sort({ bus_number: 1 });
    if (buses.length === 0) {
      throw new Error("No buses found. Run `npm run seed:buses` first.");
    }

    await BusStatus.deleteMany({});

    const statusesPayload = buses.map((bus, index) =>
      busStatusRowForBus(bus, index),
    );

    const statuses = await BusStatus.insertMany(statusesPayload);
    console.log(`✅ Created ${statuses.length} bus statuses`);
  } catch (error) {
    console.error("❌ Error seeding bus statuses:", error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  seedBusStatuses()
    .then(() => {
      console.log("🎉 Bus statuses seed complete!");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default seedBusStatuses;
