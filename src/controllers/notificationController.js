import Notification from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { buildMeta, readPagination } from "../utils/pagination.js";
import { okList, okResource } from "../utils/response.js";

/** GET /api/notifications - newest first, with the unread count. */
export async function listNotifications(req, res) {
  const { page, limit, skip } = readPagination(req.query);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ user: req.user._id }),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);

  const meta = { ...buildMeta({ page, limit, total }), unreadCount };

  return res.status(200).json({
    success: true,
    notifications: notifications.map((notification) => notification.toPublicJSON()),
    data: notifications.map((notification) => notification.toPublicJSON()),
    unreadCount,
    meta,
  });
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req, res) {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) throw ApiError.notFound("Notification not found");

  notification.read = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

  return res.status(200).json({
    success: true,
    message: "Notification marked as read",
    notification: notification.toPublicJSON(),
    data: notification.toPublicJSON(),
    unreadCount,
  });
}

/** POST /api/notifications/read-all */
export async function markAllRead(req, res) {
  const result = await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );

  return res.status(200).json({
    success: true,
    message: "All notifications marked as read",
    updated: result.modifiedCount ?? 0,
    unreadCount: 0,
    data: { updated: result.modifiedCount ?? 0, unreadCount: 0 },
  });
}

export default { listNotifications, markRead, markAllRead };
