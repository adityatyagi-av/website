import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import db from "../db/db.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
export function authenticate(req, res, next) {
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }
}
export const optionalAuthenticate = (req, _res, next) => {
  try {
    if (req.headers.authorization) {
      return authenticate(req, _res, next);
    }
    next();
  } catch {
    next();
  }
};

export function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, "Unauthorized");
      }

      const userRoles = await db.userRole.findMany({
        where: { userId: req.user.id },
        select: { roleType: true },
      });

      const roles = userRoles.map((r) => r.roleType);
      const hasRole = roles.some((role) => allowedRoles.includes(role));

      if (!hasRole) {
        throw new ApiError(403, "Forbidden: insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}