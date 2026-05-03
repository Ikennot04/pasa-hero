import { NotificationService } from "./notification.service.js";

export const addNotification = async (req, res) => {
  try {
    const notification = await NotificationService.createNotification(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const bulkDeleteNotifications = async (req, res) => {
  try {
    const notificationIds = req.body?.notification_ids;
    const result =
      await NotificationService.bulkDeleteNotificationsWithRelations(
        notificationIds,
      );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const listNotifications = async (req, res) => {
  try {
    const notifications = await NotificationService.getAllNotifications();
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const listLatestNotificationsByTerminal = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const result =
      await NotificationService.getLatestNotificationsByTerminalId(terminalId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const listNotificationsByTerminal = async (req, res) => {
  try {
    const { terminalId } = req.params;
    const result =
      await NotificationService.getAllNotificationsByTerminalId(terminalId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const listUserInboxNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await NotificationService.getInboxNotificationsByUserId(
      userId,
      req.query,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
