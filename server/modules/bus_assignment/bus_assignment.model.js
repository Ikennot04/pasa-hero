import mongoose from "mongoose";

const busAssignmentSchema = new mongoose.Schema(
  {
    bus_id: { type: String, ref: "Bus", required: true },
    driver_id: { type: String, ref: "Driver", required: true },
    operator_user_id: { type: String, ref: "Driver", required: true }, //Bus operator ni
    route_id: { type: String, ref: "Route", required: true },

    assignment_status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },
    assignment_result: {
      type: String,
      default: "pending",
      enum: ["pending", "completed", "cancelled"],
    },

    arrival_status: {
      type: String,
      default: "arrival_pending",
      enum: ["arrival_pending", "arrived"],
    },
    arrival_confirmed_by: { type: String, ref: "User", default: null }, // Terminal admin ID
    arrival_confirmed_at: { type: Date, default: null },
    
    departure_status: {
      type: String,
      default: "departure_pending",
      enum: ["departure_pending", "departed"],
    },
    departure_confirmed_by: { type: String, ref: "User", default: null }, // Terminal admin ID
    departure_confirmed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("BusAssignment", busAssignmentSchema);
