import { UserSubscriptionService } from "./user_subscription.service.js";

export const subscribeToRouteOrBus = async (req, res) => {
  try {
    const { user_id, route_id, bus_id } = req.body || {};
    const subscription =
      await UserSubscriptionService.subscribeToRouteOrBus({
        user_id,
        route_id,
        bus_id,
      });
    res.status(201).json({ success: true, data: subscription });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const unsubscribeFromRouteOrBus = async (req, res) => {
  try {
    const { user_id, route_id, bus_id } = req.body || {};
    const subscription =
      await UserSubscriptionService.unsubscribeFromRouteOrBus({
        user_id,
        route_id,
        bus_id,
      });
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

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

export const getUserSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription =
      await UserSubscriptionService.getSubscriptionById(id);
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
