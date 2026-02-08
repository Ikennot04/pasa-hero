import mongoose from "mongoose";

const userSubscriptionSchema = new mongoose.Schema(
  {
    user_id: { type: String, ref: "User", required: true },
    route_id: { type: String, ref: "Route", default: null },
    bus_id: { type: String, ref: "Bus", default: null },
  },
  { timestamps: true },
);

export default mongoose.model("UserSubscription", userSubscriptionSchema);
