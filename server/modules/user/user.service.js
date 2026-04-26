import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

import User from "./user.model.js"; // Model
import { getRoleId } from "../../utils/roleMapper.js";

async function unlinkUserUploadQuietly(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    if (err?.code !== "ENOENT") {
      console.error(
        "Failed to remove uploaded user image:",
        err?.message || err,
      );
    }
  }
}

export const UserService = {
  // SIGNUP USER ===================================================================
  async signupUser(data, userImage) {
    let img_path;
    if (userImage) {
      img_path = path.join("images/user", userImage);
    }

    // Validations
    if (!validator.isEmail(data.email)) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      throw Error("Invalid Email Format");
    }
    if (!validator.isStrongPassword(data.password)) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      throw Error(
        "Password must contains one capital letter and one special character",
      );
    }

    const checkEmail = await User.findOne({ email: data.email });
    if (checkEmail) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }

      throw new Error("Email already exists");
    }

    // Hash and Salt Password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(data.password, salt);

    // Get role and roleid
    const role = data?.role || "user";
    const roleid = getRoleId(role);

    // Create User
    const createUser = await User.create({
      ...data,
      password: hashPassword,
      profile_image: userImage,
      role: role,
      roleid: roleid,
    });
    return createUser;
  },
  // LOGIN USER ====================================================================
  async signInUser(data) {
    // Validations
    const user = await User.findOne({ email: data.email });
    if (!user) {
      const error = new Error("Email not found");
      throw error;
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid password");
      throw error;
    }

    if (user.assigned_terminal) {
      await user.populate({ path: "assigned_terminal", select: "terminal_name" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        assigned_terminal: user.assigned_terminal,
        f_name: user.f_name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" },
    );

    const userObj = user.toObject();
    delete userObj.password;
    return { user: userObj, token };
  },
  // VERIFY JWT (auth check) =========================================================
  async verifyJwtAuth(token) {
    if (!token || typeof token !== "string") {
      throw new Error("No token provided");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      throw new Error("Invalid token payload");
    }
    const user = await User.findById(userId).select(
      "f_name l_name role assigned_terminal",
    );
    if (!user) {
      throw new Error("User not found");
    }
    return { user };
  },
  // LOGOUT USER ====================================================================
  async logoutUser(id) {
    let user;

    user = await User.findById(id);
    if (!user) {
      throw new Error("User not found");
    }
    user = await User.findByIdAndUpdate(id, { status: "inactive" });

    return user;
  },
  // GET USER BY ID ===================================================================
  async getUserById(id) {
    const user = await User.findById(id)
      .populate({ path: "assigned_terminal", select: "terminal_name" })
      .populate({ path: "created_by", select: "f_name l_name email role" });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  },
  // GET ALL USERS ===================================================================
  async getAllUsers() {
    const users = await User.find()
      .populate({ path: "assigned_terminal", select: "terminal_name" })
      .populate({ path: "created_by", select: "f_name l_name email role" });
    return users;
  },
  // CREATE ADMIN USER ===============================================================
  /** @param {import("mongoose").Types.ObjectId|string|null} [creatorUserId] - JWT user creating the record (for operators) */
  async createAdminUser(data, userImage, creatorUserId = null) {
    let img_path;
    if (userImage) {
      img_path = path.join("images/user", userImage);
    }

    // Validations
    if (!validator.isEmail(data.email)) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      throw Error("Invalid Email Format");
    }
    if (!validator.isStrongPassword(data.password)) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      throw Error(
        "Password must contains one capital letter and one special character",
      );
    }

    const checkEmail = await User.findOne({ email: data.email });
    if (checkEmail) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      const error = new Error("Email already exists");
      error.statusCode = 400;
      throw error;
    }

    // Validate admin role
    const validAdminRoles = ["super admin", "operator", "terminal admin"];
    const role = data?.role || "user";
    if (!validAdminRoles.includes(role)) {
      if (img_path) {
        await unlinkUserUploadQuietly(img_path);
      }
      throw Error(
        "Invalid admin role. Must be one of: super admin, operator, terminal admin",
      );
    }

    const payload = { ...data };
    delete payload.created_by;

    let created_by = null;
    if (role === "operator") {
      if (!payload.assigned_terminal) {
        if (img_path) {
          await unlinkUserUploadQuietly(img_path);
        }
        const err = new Error("Operator requires assigned_terminal");
        err.statusCode = 400;
        throw err;
      }
      if (creatorUserId) {
        const creator = await User.findById(creatorUserId).select(
          "role assigned_terminal",
        );
        if (!creator) {
          if (img_path) {
            await unlinkUserUploadQuietly(img_path);
          }
          const err = new Error("Creator not found");
          err.statusCode = 400;
          throw err;
        }
        if (creator.role === "terminal admin") {
          if (
            !creator.assigned_terminal ||
            String(creator.assigned_terminal) !==
              String(payload.assigned_terminal)
          ) {
            if (img_path) {
              await unlinkUserUploadQuietly(img_path);
            }
            const err = new Error(
              "Operator must be assigned to the same terminal as the creating terminal admin",
            );
            err.statusCode = 403;
            throw err;
          }
          created_by = creator._id;
        } else if (creator.role === "super admin") {
          created_by = creator._id;
        } else {
          if (img_path) {
            await unlinkUserUploadQuietly(img_path);
          }
          const err = new Error(
            "Only terminal admin or super admin can create operators",
          );
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // Hash and Salt Password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(data.password, salt);

    // Get roleid from role
    const roleid = getRoleId(role);

    // Create Admin User
    const createUser = await User.create({
      ...payload,
      password: hashPassword,
      profile_image: userImage,
      role: role,
      roleid: roleid,
      ...(role === "operator" ? { created_by } : {}),
    });
    return createUser;
  },
  // UPDATE USER ===================================================================
  async updateUser(id, data) {
    // Get current user data to check existing profile_image
    const user = await User.findById(id);
    let oldImage = user?.profile_image;

    console.log(data?.profile_image);

    // If a new image is being set and it's different from the old one, remove the old image (unless it's default.png)
    if (
      data?.profile_image &&
      oldImage &&
      data.profile_image !== oldImage &&
      oldImage !== "default.png"
    ) {
      const imgPath = path.join("images", "user", oldImage);
      try {
        await fs.promises.unlink(imgPath);
        console.log("Old user image deleted");
      } catch (err) {
        console.error(`Error deleting old user image: ${err}`);
      }
    }

    // If role is being updated, also update roleid
    const updateData = { ...data };
    if (data?.role) {
      updateData.roleid = getRoleId(data.role);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...updateData,
        profile_image: data?.profile_image,
      },
      { returnDocument: "after" },
    );
    return updatedUser;
  },
};
