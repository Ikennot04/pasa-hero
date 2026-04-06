import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebase_id: { type: String, default: null },
    f_name: { type: String, required: true },
    l_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profile_image: { type: String, default: "default.png" },
    role: {
      type: String,
      enum: ["user", "super admin", "admin", "operator", "terminal admin"],
      default: "user",
      required: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },
    assigned_terminal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Terminal",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
