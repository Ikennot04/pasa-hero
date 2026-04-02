import UserSubscription from "./user_subscription.model.js";

export const UserSubscriptionService = {
  async getSubscriptionsByUser(userId) {
    if (!userId) {
      const error = new Error("user_id is required");
      error.statusCode = 400;
      throw error;
    }

    return UserSubscription.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "route_id",
        select: "route_name route_code status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number status",
      });
  },
};
