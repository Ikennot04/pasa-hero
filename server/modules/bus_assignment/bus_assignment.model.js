import mongoose from "mongoose";

const busAssignmentSchema = new mongoose.Schema(
  {
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    driver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    operator_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Bus operator user id
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

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

    latest_terminal_log_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TerminalLog",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("BusAssignment", busAssignmentSchema);
