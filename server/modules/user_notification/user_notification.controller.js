import { UserNotificationService } from "./user_notification.service.js";

export const listCurrentUserNotifications = async (req, res) => {
  try {
    const userId = req.query.user_id || req.body?.user_id || req.user?.id || req.user?._id;
    const notifications = await UserNotificationService.getNotificationsByUser(userId);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
