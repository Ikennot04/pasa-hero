import Bus from "../modules/bus/bus.model.js";
import Driver from "../modules/driver/driver.model.js";
import User from "../modules/user/user.model.js";
import BusAssignment from "../modules/bus_assignment/bus_assignment.model.js";

const SEED_IDENTIFIERS = {
  busNumber: "SEED-UNASSIGNED-001",
  plateNumber: "UNA-0001",
  driverLicense: "SEED-DRV-UNASSIGNED-001",
  operatorEmail: "seed.unassigned.operator@pasahero.local",
};

async function ensureUnassignedBus() {
  let bus = await Bus.findOne({ bus_number: SEED_IDENTIFIERS.busNumber });
  if (!bus) {
    bus = await Bus.create({
      bus_number: SEED_IDENTIFIERS.busNumber,
      plate_number: SEED_IDENTIFIERS.plateNumber,
      capacity: 45,
      status: "active",
    });
    return { bus, created: true };
  }
  return { bus, created: false };
}

async function ensureUnassignedDriver() {
  let driver = await Driver.findOne({ license_number: SEED_IDENTIFIERS.driverLicense });
  if (!driver) {
    driver = await Driver.create({
      f_name: "Seed",
      l_name: "UnassignedDriver",
      license_number: SEED_IDENTIFIERS.driverLicense,
      contact_number: "09999999999",
      status: "active",
    });
    return { driver, created: true };
  }
  return { driver, created: false };
}

async function ensureUnassignedOperator() {
  let operator = await User.findOne({ email: SEED_IDENTIFIERS.operatorEmail });
  if (!operator) {
    operator = await User.create({
      f_name: "Seed",
      l_name: "UnassignedOperator",
      email: SEED_IDENTIFIERS.operatorEmail,
      password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
      role: "operator",
      roleid: 2,
      status: "active",
      firebase_id: "firebase_seed_unassigned_operator_001",
      profile_image: "default.png",
    });
    return { operator, created: true };
  }
  return { operator, created: false };
}

async function hasAnyAssignment(busId, driverId, operatorId) {
  const existing = await BusAssignment.exists({
    $or: [
      { bus_id: busId },
      { driver_id: driverId },
      { operator_user_id: operatorId },
    ],
  });
  return Boolean(existing);
}

export default async function seedUnassignedBusDriverOperator() {
  const [{ bus, created: busCreated }, { driver, created: driverCreated }, { operator, created: operatorCreated }] =
    await Promise.all([
      ensureUnassignedBus(),
      ensureUnassignedDriver(),
      ensureUnassignedOperator(),
    ]);

  const assigned = await hasAnyAssignment(bus._id, driver._id, operator._id);
  if (assigned) {
    console.warn(
      "⚠️ Unassigned dev seed entities already have assignment links. Keeping records unchanged.",
    );
    return;
  }

  const createdCount =
    Number(busCreated) + Number(driverCreated) + Number(operatorCreated);

  if (createdCount > 0) {
    console.log(
      `✅ Seeded ${createdCount} unassigned dev records (bus/driver/operator).`,
    );
  } else {
    console.log("ℹ️ Unassigned dev records already exist.");
  }
}
