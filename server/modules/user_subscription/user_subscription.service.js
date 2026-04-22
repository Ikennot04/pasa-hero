import UserSubscription from "./user_subscription.model.js";
import Route from "../route/route.model.js";
import Bus from "../bus/bus.model.js";

export const UserSubscriptionService = {
  // SUBCRIBE TO ROUTE OR BUS ===================================================================
  async subscribeToRouteOrBus({ user_id, route_id, bus_id }) {
    if (!user_id) {
      const error = new Error("user_id is required");
      error.statusCode = 400;
      throw error;
    }

    const hasRoute = Boolean(route_id);
    const hasBus = Boolean(bus_id);

    if (hasRoute === hasBus) {
      const error = new Error(
        "Provide exactly one of route_id or bus_id to subscribe.",
      );
      error.statusCode = 400;
      throw error;
    }

    if (hasRoute) {
      const route = await Route.findById(route_id);
      if (!route) {
        const error = new Error("Route not found.");
        error.statusCode = 404;
        throw error;
      }
    }

    if (hasBus) {
      const bus = await Bus.findOne({
        _id: bus_id,
        is_deleted: { $ne: true },
      });
      if (!bus) {
        const error = new Error("Bus not found.");
        error.statusCode = 404;
        throw error;
      }
    }

    const duplicateFilter = hasRoute
      ? { user_id, route_id, bus_id: null }
      : { user_id, route_id: null, bus_id };

    const existing = await UserSubscription.findOne(duplicateFilter);
    if (existing) {
      const error = new Error("Already subscribed.");
      error.statusCode = 409;
      throw error;
    }

    const doc = hasRoute
      ? { user_id, route_id, bus_id: null }
      : { user_id, route_id: null, bus_id };

    const created = await UserSubscription.create(doc);
    return UserSubscription.findById(created._id)
      .populate({
        path: "route_id",
        select: "route_name route_code status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number status",
      });
  },

  // UNSUBSCRIBE FROM ROUTE OR BUS ===================================================================
  async unsubscribeFromRouteOrBus({ user_id, route_id, bus_id }) {
    if (!user_id) {
      const error = new Error("user_id is required");
      error.statusCode = 400;
      throw error;
    }

    const hasRoute = Boolean(route_id);
    const hasBus = Boolean(bus_id);

    if (hasRoute === hasBus) {
      const error = new Error(
        "Provide exactly one of route_id or bus_id to unsubscribe.",
      );
      error.statusCode = 400;
      throw error;
    }

    const filter = hasRoute
      ? { user_id, route_id, bus_id: null }
      : { user_id, route_id: null, bus_id };

    const subscription = await UserSubscription.findOne(filter)
      .populate({
        path: "route_id",
        select: "route_name route_code status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number status",
      });

    if (!subscription) {
      const error = new Error("Subscription not found.");
      error.statusCode = 404;
      throw error;
    }

    await UserSubscription.deleteOne({ _id: subscription._id });
    return subscription;
  },

  // GET SUBSCRIPTIONS BY USER ===================================================================
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

  // GET SUBSCRIPTION BY ID ===================================================================
  async getSubscriptionById(id) {
    if (!id) {
      const error = new Error("Subscription id is required");
      error.statusCode = 400;
      throw error;
    }

    const subscription = await UserSubscription.findById(id)
      .populate({
        path: "route_id",
        select: "route_name route_code status",
      })
      .populate({
        path: "bus_id",
        select: "bus_number plate_number status",
      });

    if (!subscription) {
      const error = new Error("User subscription not found.");
      error.statusCode = 404;
      throw error;
    }

    return subscription;
  },
};
