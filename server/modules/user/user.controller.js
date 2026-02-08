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
