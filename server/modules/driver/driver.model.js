import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    f_name: { type: String, required: true },
    l_name: { type: String, required: true },
    license_number: { type: String, required: true },
    contact_number: { type: String },
    profile_image: { type: String, default: "default.png" },
    status: { type: String, default: "active", enum: ["active", "inactive"] },
  },
  { timestamps: true },
);

export default mongoose.model("Driver", driverSchema);
