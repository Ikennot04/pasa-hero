import "dotenv/config";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Notification from "../modules/notification/notification.model.js";
import UserNotification from "../modules/user_notification/user_notification.model.js";
import UserSubscription from "../modules/user_subscription/user_subscription.model.js";
import User from "../modules/user/user.model.js";

function requireMongoUri() {
  const uri = process.env.MONGO_DB_URI?.trim();
  if (!uri) {
    throw new Error(
      "Missing MONGO_DB_URI. Add it to server/.env before running this seeder.",
    );
  }
  return uri;
}

function shouldResetExisting() {
  return String(process.env.SEED_USER_NOTIFICATIONS_RESET || "").toLowerCase() === "true";
}

function isOpsRole(role) {
  return role === "super admin" || role === "operator" || role === "terminal admin";
}

function toIdString(value) {
  if (!value) return null;
  return String(value);
}

function unique(values) {
  return [...new Set(values)];
}

function buildSubscriptionMaps(subscriptions) {
  const routeToUsers = new Map();
  const busToUsers = new Map();

  for (const row of subscriptions) {
    const userId = toIdString(row.user_id);
    const routeId = toIdString(row.route_id);
    const busId = toIdString(row.bus_id);

    if (routeId) {
      if (!routeToUsers.has(routeId)) routeToUsers.set(routeId, new Set());
      routeToUsers.get(routeId).add(userId);
    }

    if (busId) {
      if (!busToUsers.has(busId)) busToUsers.set(busId, new Set());
      busToUsers.get(busId).add(userId);
    }
  }

  return { routeToUsers, busToUsers };
}

function getRecipientsForNotification(notification, ctx) {
  const recipients = new Set(ctx.opsUserIds);
  const scope = notification.scope;
  const routeId = toIdString(notification.route_id);
  const busId = toIdString(notification.bus_id);

  if (scope === "system") {
    for (const userId of ctx.activeUserIds) recipients.add(userId);
    return recipients;
  }

  if ((scope === "route" || scope === "terminal") && routeId) {
    for (const userId of ctx.routeToUsers.get(routeId) || []) recipients.add(userId);
  }

  if ((scope === "bus" || scope === "terminal") && busId) {
    for (const userId of ctx.busToUsers.get(busId) || []) recipients.add(userId);
  }

  return recipients;
}

async function seedUserNotifications() {
  const mongoUri = requireMongoUri();
  await mongoose.connect(mongoUri);
  console.log("📦 Connected to MongoDB");

  try {
    if (shouldResetExisting()) {
      const resetResult = await UserNotification.deleteMany({});
      console.log(`🧹 Reset user notifications: ${resetResult.deletedCount}`);
    }

    const [users, subscriptions, notifications] = await Promise.all([
      User.find({ status: "active" }).select("_id role").lean(),
      UserSubscription.find({}).select("user_id route_id bus_id").lean(),
      Notification.find({})
        .sort({ createdAt: -1, _id: -1 })
        .select("_id scope route_id bus_id")
        .lean(),
    ]);

    if (!users.length) {
      console.log("ℹ️ No active users found. Nothing to seed.");
      return;
    }

    if (!notifications.length) {
      console.log("ℹ️ No notifications found. Nothing to seed.");
      return;
    }

    const activeUserIds = users.map((u) => String(u._id));
    const opsUserIds = users.filter((u) => isOpsRole(u.role)).map((u) => String(u._id));
    const { routeToUsers, busToUsers } = buildSubscriptionMaps(subscriptions);

    const existingRows = await UserNotification.find({})
      .select("user_id notification_id")
      .lean();
    const existingPairs = new Set(
      existingRows.map((row) => `${toIdString(row.user_id)}::${toIdString(row.notification_id)}`),
    );

    const rowsToInsert = [];
    for (const notification of notifications) {
      const recipients = getRecipientsForNotification(notification, {
        activeUserIds,
        opsUserIds,
        routeToUsers,
        busToUsers,
      });

      for (const userId of unique([...recipients])) {
        const notificationId = String(notification._id);
        const key = `${userId}::${notificationId}`;
        if (existingPairs.has(key)) continue;

        rowsToInsert.push({
          user_id: userId,
          notification_id: notificationId,
          is_read: false,
          read_at: null,
        });
        existingPairs.add(key);
      }
    }

    if (!rowsToInsert.length) {
      console.log("ℹ️ User notifications are already up to date.");
      return;
    }

    const inserted = await UserNotification.insertMany(rowsToInsert);
    console.log(`✅ Created ${inserted.length} user notification rows.`);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (isDirectRun) {
  seedUserNotifications()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Failed to seed user notifications:", err.message);
      process.exit(1);
    });
}

export default seedUserNotifications;
