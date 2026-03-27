import mongoose from "mongoose";

const terminalLogSchema = new mongoose.Schema(
  {
    bus_assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusAssignment",
      required: true,
    },
    terminal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Terminal",
      required: true,
    },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    event_type: {
      type: String,
      required: true,
      enum: ["arrival", "departure"],
    },

    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    confirmed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    auto_detected: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },

    event_time: { type: Date, required: true },
    confirmation_time: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("TerminalLog", terminalLogSchema);
