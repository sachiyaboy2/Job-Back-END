import Notification from "../models/Notification.js";

/**
 * Create a notification for a user. Never throws into the caller's flow:
 * a failed notification must not roll back the action that triggered it.
 */
export async function notifyUser({ user, title, body, type = "system", link = null }) {
  if (!user) return null;
  try {
    return await Notification.create({
      user,
      title,
      body,
      type,
      link,
      read: false,
    });
  } catch (error) {
    console.error("[notify] Could not create notification:", error.message);
    return null;
  }
}

export default notifyUser;
