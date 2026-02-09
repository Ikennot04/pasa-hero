import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    sender_id: { type: String, ref: "User", required: true },
    bus_id: { type: String, ref: "Bus", default: null },
    route_id: { type: String, ref: "Route", default: null },
    terminal_id: { type: String, ref: "Terminal", default: null },
    title: { type: String, required: true },
    message: { type: String, required: true },
    notification_type: { 
      type: String, 
      enum: ["delay", "full", "skipped_stop", "info"],
      required: true 
    },
    priority: { 
      type: String, 
      enum: ["high", "medium", "low"],
      default: "medium" 
    },
    scope: { 
      type: String, 
      enum: ["bus", "route", "terminal", "system"],
      required: true 
    },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
