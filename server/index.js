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

const app = express();

// Middleware
// CORS configuration - allow all localhost ports for development
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
  'http://localhost:3000', 
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:5000',
  'http://localhost:51140', // Flutter web default port
  /^http:\/\/localhost:\d+$/, // Allow any localhost port
  'https://pasahero-db.firebaseapp.com',
  'https://pasahero-db.web.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // In development, allow all localhost origins
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
