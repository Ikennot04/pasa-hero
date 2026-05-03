import jwt from "jsonwebtoken";
import User from "../modules/user/user.model.js";

/**
 * Optional JWT auth: if a valid `Authorization: Bearer <token>` is present,
 * decodes it, looks up the user, and attaches `req.user`. Never blocks the
 * request — downstream handlers are responsible for enforcing auth when
 * required. This is used to identify the actor for system_log entries.
 */
export const attachAuthUser = async (req, _res, next) => {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.userId;
    if (!userId) return next();

    const user = await User.findById(userId).select(
      "f_name l_name email role assigned_terminal status",
    );
    if (user) {
      req.user = user;
    }
  } catch {
    // Swallow any auth error — this middleware is optional. Endpoints that
    // require an authenticated actor should validate `req.user` themselves.
  }
  return next();
};
