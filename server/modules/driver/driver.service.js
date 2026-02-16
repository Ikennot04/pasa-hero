import path from "path";
import fs from "fs";
import Driver from "./driver.model.js";

export const DriverService = {
  // GET ALL DRIVERS ===================================================================
  async getAllDrivers() {
    const drivers = await Driver.find();
    return drivers;
  },
  // GET DRIVER BY ID ===================================================================
  async getDriverById(id) {
    const driver = await Driver.findById(id);
    if (!driver) {
      const error = new Error("Driver not found.");
      error.statusCode = 404;
      throw error;
    }
    return driver;
  },
  // CREATE DRIVER ===================================================================
  async createDriver(driverData, driverImg) {
    let img_path;
    if (driverImg) {
      img_path = path.join("images/drivers", driverImg);
    }

    // Validations
    const existing = await Driver.findOne({
      license_number: driverData.license_number,
    });
    if (existing) {
      if (img_path) {
        fs.unlink(img_path, (err) => {
          if (err) throw err;
          console.log("driver img delete");
        });
      }
      const error = new Error("A driver with this license number already exists.");
      error.statusCode = 409;
      throw error;
    }

    const driver = await Driver.create({
      ...driverData,
      profile_image: driverImg,
    });
    return driver;
  },
};
