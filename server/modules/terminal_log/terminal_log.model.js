import mongoose from "mongoose";

const terminalLogSchema = new mongoose.Schema(
  {
    terminal_id: { type: String, ref: "Terminal", required: true },
    bus_id: { type: String, ref: "Bus", required: true },
    event_type: {
      type: String,
      required: true,
      enum: ["arrival", "departure", "delay"],
    },
    remarks: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("TerminalLog", terminalLogSchema);
