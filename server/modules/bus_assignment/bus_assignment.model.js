import mongoose from "mongoose";

const busAssignmentSchema = new mongoose.Schema(
  {
    bus_id: { type: String, ref: "Bus", required: true },
    driver_id: { type: String, ref: "Driver", required: true },
    operator_user_id: { type: String, ref: "Driver", required: true }, //Bus operator ni
    route_id: { type: String, ref: "Route", required: true },
    terminal_id: { type: String, ref: "Terminal", required: true },
    status: { type: String, default: "active", enum: ["active", "ended"] },
  },
  { timestamps: true },
);

export default mongoose.model("BusAssignment", busAssignmentSchema);
