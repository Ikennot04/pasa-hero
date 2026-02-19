import mongoose from "mongoose";

const busStatusSchema = new mongoose.Schema(
  {
    bus_id: { type: String, ref: "Bus", required: true, unique: true },
    occupancy_count: { type: Number, default: 0 },
    occupancy_status: { 
      type: String, 
      enum: ["empty", "few seats", "standing room", "full"], 
      default: "empty" 
    },
    delay_minutes: { type: Number, default: 0 },
    is_skipping_stops: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }, 
);

export default mongoose.model("BusStatus", busStatusSchema);
