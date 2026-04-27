import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema(
  {
    user_id: { type: String, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "Login",
        "Logout",
        "Create Operator",
        "Update Operator",
        "Delete Operator",
        "Create Route",
        "Update Route",
        "Delete Route",
        "Create Terminal",
        "Update Terminal",
        "Delete Terminal",
        "Assign Bus",
        "Remove Bus Assignment",
        // Add more actions as required
      ],
    },
    description: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("SystemLog", systemLogSchema);
