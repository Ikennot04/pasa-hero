import path from "path";
import fs from "fs";
import Driver from "./driver.model.js";

export const DriverService = {
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
