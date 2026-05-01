import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import mongoose from "mongoose";
import compression from 'compression';
import admin from './config/firebase.config.js';

// Import routes
import userRoutes from "./modules/user/user.route.js";
import userFirebaseRoutes from "./modules/user_firebase/user_firebase.route.js";
import terminalRoutes from "./modules/terminal/terminal.route.js";
import routeRoutes from "./modules/route/route.route.js";
import busRoutes from "./modules/bus/bus.route.js";
import driverRoutes from "./modules/driver/driver.route.js";
import busStatusRoutes from "./modules/bus_status/bus_status.route.js";
import routeStopRoutes from "./modules/route_stop/route_stop.route.js";
import otpRoutes from "./modules/otp/otp.route.js";
import terminalLogRoutes from "./modules/terminal_log/terminal_log.route.js";
import busAssignmentRoutes from "./modules/bus_assignment/bus_assignment.route.js";
import notificationRoutes from "./modules/notification/notification.route.js";
import userNotificationRoutes from "./modules/user_notification/user_notification.route.js";
import userSubscriptionRoutes from "./modules/user_subscription/user_subscription.route.js";
import systemLogRoutes from "./modules/system_log/system_log.route.js";
import dashboardRoutes from "./modules/admin_dashboard/dashboard.route.js";
import seedUnassignedBusDriverOperator from "./seeders/unassignedBusDriverOperator.seeder.js";

const app = express();

app.use(cors());
dotenv.config();
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    firebase: admin.apps.length > 0 ? 'connected' : 'not configured',
  });
});

// MongoDB Connection
const _dbURI = process.env.MONGO_DB_URI;
if (!_dbURI) {
  console.warn('⚠️  MONGO_DB_URI is not set in .env file');
  console.warn('   MongoDB connection will not be established');
  console.warn('   Some features may not work without MongoDB');
  console.warn('   To fix: Add MONGO_DB_URI=your_mongodb_connection_string to server/.env file');
} else {
  mongoose.connect(_dbURI)
    .then(() => {
      console.log("✅ Connected to Mongo DB");
      seedUnassignedBusDriverOperator().catch((seedError) => {
        console.error(
          "❌ Failed to seed unassigned SM bus/driver/operator:",
          seedError.message,
        );
      });
    })
    .catch((error) => {
      console.error('❌ MongoDB connection failed:', error.message);
      console.error('   Please check your MONGO_DB_URI in .env file');
      console.error('   Server will continue running, but database features will not work');
    });
}

// Image static folder
app.use("/images", express.static("images"));

// API Routes
app.use('/api/users/firebase', userFirebaseRoutes);
app.use("/api/otp", otpRoutes)
app.use("/api/users", userRoutes);
app.use("/api/terminals", terminalRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/bus-status", busStatusRoutes);
app.use("/api/route-stops", routeStopRoutes);;
app.use("/api/terminal-logs", terminalLogRoutes);
app.use("/api/bus-assignments", busAssignmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/user-notifications", userNotificationRoutes);
app.use("/api/user-subscriptions", userSubscriptionRoutes);
app.use("/api/system-logs", systemLogRoutes);
app.use("/api/admin-dashboard", dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Local Server
app.listen(process.env.PORT, () =>
  console.log(`Listening to port ${process.env.PORT}`),
);

export default app;
