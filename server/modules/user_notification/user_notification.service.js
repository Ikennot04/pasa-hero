import UserNotification from "./user_notification.model.js";

function populateUserNotificationRefs(query) {
  return query
    .populate({
      path: "notification_id",
      populate: [
        { path: "sender_id", select: "f_name l_name" },
        { path: "bus_id", select: "bus_number plate_number" },
        { path: "route_id", select: "route_name route_code" },
        { path: "terminal_id", select: "terminal_name" },
      ],
    })
    .sort({ createdAt: -1 });
}

export const UserNotificationService = {
  // GET CURRENT USER NOTIFICATIONS =========================================
  async getUserNotifications(userId) {
    const query = UserNotification.find({ user_id: userId });
    return populateUserNotificationRefs(query);
  },
};
