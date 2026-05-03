import mongoose from "mongoose";
import seedUnassignedBusDriverOperator from "./seeders/unassignedBusDriverOperator.seeder.js";

const globalForMongoose = globalThis;

if (!globalForMongoose.__mongooseCache) {
  globalForMongoose.__mongooseCache = { promise: null };
}

const cache = globalForMongoose.__mongooseCache;

const connectOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 15000,
};

function logConnectedOnce() {
  if (globalForMongoose.__mongoConnectLogged) return;
  globalForMongoose.__mongoConnectLogged = true;
  console.log("✅ Connected to Mongo DB");
}

function scheduleStartupSeed() {
  if (globalForMongoose.__unassignedSeedScheduled) return;
  globalForMongoose.__unassignedSeedScheduled = true;
  setImmediate(() => {
    seedUnassignedBusDriverOperator().catch((seedError) => {
      console.error(
        "❌ Failed to seed unassigned SM bus/driver/operator:",
        seedError.message,
      );
    });
  });
}

/**
 * Await before any Mongoose queries. Reuses one connection per serverless instance.
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    throw new Error(
      "MONGO_DB_URI is not set. Add it to your environment (e.g. Vercel project env).",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, connectOptions);
  }

  try {
    await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  logConnectedOnce();
  scheduleStartupSeed();

  return mongoose.connection;
}
