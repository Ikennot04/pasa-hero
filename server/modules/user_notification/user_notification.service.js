import UserNotification from "./user_notification.model.js";

function populateUserNotificationRefs(query) {
  return query
    .populate({
      path: "user_id",
      select: "f_name l_name",
    })
    .populate({
      path: "notification_id",
      populate: [
        { path: "sender_id", select: "f_name l_name" },
        { path: "bus_id", select: "bus_number plate_number" },
        { path: "route_id", select: "route_name route_code" },
        { path: "terminal_id", select: "terminal_name" },
      ],
    });
}

export const UserNotificationService = {
  async getNotificationsByUser(userId) {
    if (!userId) {
      const error = new Error("user_id is required");
      error.statusCode = 400;
      throw error;
    }

    const query = UserNotification.find({ user_id: userId }).sort({ createdAt: -1 });
    const populatedQuery = populateUserNotificationRefs(query);
    return populatedQuery;
  },
};
