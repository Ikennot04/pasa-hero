import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, ref: "User", required: true },
    action: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("SystemLog", systemLogSchema);
