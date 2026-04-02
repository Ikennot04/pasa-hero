import { UserSubscriptionService } from "./user_subscription.service.js";

export const listCurrentUserSubscriptions = async (req, res) => {
  try {
    const userId = req.body?.user_id;
    const subscriptions =
      await UserSubscriptionService.getSubscriptionsByUser(userId);
    res.status(200).json({ success: true, data: subscriptions });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
