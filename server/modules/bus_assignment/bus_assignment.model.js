import mongoose from "mongoose";

const busAssignmentSchema = new mongoose.Schema(
  {
    bus_id: { type: String, ref: "Bus", required: true },
    driver_id: { type: String, ref: "Driver", required: true },
    operator_user_id: { type: String, ref: "Driver", required: true }, //Bus operator ni
    route_id: { type: String, ref: "Route", required: true },

    status: {
      type: String,
      default: "scheduled",
      enum: [
        "scheduled",
        "active",
        "inactive",
        "arrival_pending",
        "arrived",
        "completed",
        "cancelled",
      ],
    },

    arrival_confirmed_by: { type: String, ref: "User", default: null }, // Terminal admin ID
    arrival_confirmed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("BusAssignment", busAssignmentSchema);
