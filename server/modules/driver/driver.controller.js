import { DriverService } from "./driver.service.js";

export const createDriver = async (req, res) => {
  try {
    const driverData = JSON.parse(req?.body?.data);
    const driverImg = req.file?.filename;

    const driver = await DriverService.createDriver(driverData, driverImg);
    res.status(201).json({ success: true, data: driver });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};
