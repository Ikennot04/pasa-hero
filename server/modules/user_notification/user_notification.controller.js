import { UserNotificationService } from "./user_notification.service.js";

function resolveCurrentUserId(req) {
  return (
    req.user?.id ||
    req.user?._id ||
    req.user_id ||
    req.headers["x-user-id"] ||
    req.query.user_id
  );
}

export const listCurrentUserNotifications = async (req, res) => {
  try {
    const userId = resolveCurrentUserId(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message:
          "Current user id is required. Provide it from auth context or x-user-id header.",
      });
    }

    const notifications =
      await UserNotificationService.getUserNotifications(userId);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
