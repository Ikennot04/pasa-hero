import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Bus from "../modules/bus/bus.model.js";
import BusStatus from "../modules/bus_status/bus_status.model.js";
import { getOccupancyStatus } from "../modules/bus_status/occupancy.util.js";

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

export { getOccupancyStatus };

/** Seeded bus status row: out-of-service and maintenance buses are always empty. */
export function busStatusPayloadForSeedBus(bus, index) {
  if (bus.status === "out of service" || bus.status === "maintenance") {
    return {
      bus_id: String(bus._id),
      occupancy_count: 0,
      occupancy_status: "empty",
      is_deleted: false,
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
    is_deleted: false,
  };
}

/** Used by `allSchema.seeder.js` after buses are inserted (DB already cleared for BusStatus). */
export async function insertBusStatusesForSeedBuses(buses) {
  return BusStatus.insertMany(
    buses.map((bus, index) => busStatusPayloadForSeedBus(bus, index)),
  );
}

const seedBusStatuses = async () => {
  try {
    await ensureDbConnected();

    const buses = await Bus.find({ is_deleted: false }).sort({ bus_number: 1 });
    if (buses.length === 0) {
      throw new Error("No buses found. Run `npm run seed:buses` first.");
    }

    await BusStatus.deleteMany({});

    const statuses = await insertBusStatusesForSeedBuses(buses);
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
