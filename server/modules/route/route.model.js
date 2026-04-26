import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    route_name: { type: String, required: true },
    route_code: { type: String, required: true },
    start_terminal_id: {
      type: String,
      ref: "Terminal",
      default: null,
    },
    end_terminal_id: {
      type: String,
      ref: "Terminal",
      default: null,
    },
    
    // Optional coordinate endpoints for routes without a terminal endpoint.
    start_location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    end_location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    estimated_duration: { type: Number }, // minutes
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },
    route_type: {
      type: String,
      default: "normal",
      enum: ["normal", "vice_versa"],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Route", routeSchema);
