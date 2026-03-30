import Notification from "./notification.model.js";

function populateNotificationRefs(query) {
  return query
    .populate({ path: "sender_id", select: "f_name l_name" })
    .populate({ path: "bus_id", select: "bus_number plate_number" })
    .populate({ path: "route_id", select: "route_name route_code" })
    .populate({ path: "terminal_id", select: "terminal_name" });
}

export const NotificationService = {
  // CREATE NOTIFICATION ===================================================
  async createNotification(payload) {
    const doc = await Notification.create(payload);
    const populated = await populateNotificationRefs(
      Notification.findById(doc._id),
    );
    return populated;
  },
};
