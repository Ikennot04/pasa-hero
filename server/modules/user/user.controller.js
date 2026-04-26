import { UserService } from "./user.service.js";

export const signupUser = async (req, res) => {
  try {
    const userData = JSON.parse(req?.body?.data);
    const userImg = req.file?.filename;

    const user = await UserService.signupUser(userData, userImg);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const signInUser = async (req, res) => {
  try {
    const { user, token } = await UserService.signInUser(req?.body);
    res.status(200).json({ success: true, data: user, token });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const checkJwtAuth = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];

    const { user, payload } = await UserService.verifyJwtAuth(token);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    const jwtError =
      error.name === "JsonWebTokenError" || error.name === "TokenExpiredError";
    const message = jwtError ? "Invalid or expired token" : error.message;
    res.status(401).json({ success: false, message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const user = await UserService.logoutUser(userId);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const userId = req?.params?.id;

    const user = await UserService.getUserById(userId);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const userData = JSON.parse(req?.body?.data);
    const userImg = req.file?.filename;

    let creatorUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const { user: authUser } = await UserService.verifyJwtAuth(token);
        creatorUserId = authUser._id;
      } catch {
        creatorUserId = null;
      }
    }

    const user = await UserService.createAdminUser(
      userData,
      userImg,
      creatorUserId,
    );
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const userId = req?.params?.id;
    const userData = JSON.parse(req?.body?.data);
    const profile_image = req.file?.filename;

    const user = await UserService.updateUser(userId, {
      ...userData,
      profile_image,
    });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
