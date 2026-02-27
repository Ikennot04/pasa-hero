import mongoose from "mongoose";
import { getRoleId } from "../../utils/roleMapper.js";

const userSchema = new mongoose.Schema(
  {
    firebase_id: { type: String, default: null }, 
    f_name: { type: String, required: true },
    l_name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profile_image: { type: String, default: 'default.png' },
    role: {
      type: String,
      enum: ["user", "super admin", "operator", "terminal admin"],
      default: "user",
      required: true,
    },
    roleid: {
      type: Number,
      enum: [1, 2, 3, 4], // 1: user, 2: operator, 3: terminal admin, 4: super admin
      default: 1,
      required: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive", "suspended"],
    },
  },
  { timestamps: true },
);

// Pre-save hook to automatically set roleid based on role if not provided
userSchema.pre('save', function(next) {
  if (this.isModified('role') || !this.roleid) {
    this.roleid = getRoleId(this.role);
  }
  next();
});

export default mongoose.model("User", userSchema);
