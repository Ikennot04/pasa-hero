import Bus from "../modules/bus/bus.model.js";
import Driver from "../modules/driver/driver.model.js";
import User from "../modules/user/user.model.js";
import Terminal from "../modules/terminal/terminal.model.js";

const UNASSIGNED_BUS = {
  bus_number: "SM-UNASSIGNED-001",
  plate_number: "SMU-1001",
  capacity: 48,
  status: "active",
};

const UNASSIGNED_DRIVERS = [
  {
    f_name: "Daniel",
    l_name: "Mercado",
    license_number: "SM-UNASSIGNED-DRIVER-001",
    contact_number: "09990000001",
    status: "active",
  },
  {
    f_name: "Erwin",
    l_name: "Salazar",
    license_number: "SM-UNASSIGNED-DRIVER-002",
    contact_number: "09990000002",
    status: "active",
  },
  {
    f_name: "Joel",
    l_name: "Fernandez",
    license_number: "SM-UNASSIGNED-DRIVER-003",
    contact_number: "09990000003",
    status: "active",
  },
];

const UNASSIGNED_OPERATORS = [
  {
    f_name: "Carlo",
    l_name: "Mendoza",
    email: "seed.unassigned.operator@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_001",
    profile_image: "default.png",
  },
  {
    f_name: "Paulo",
    l_name: "Sarmiento",
    email: "seed.unassigned.operator2@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_002",
    profile_image: "default.png",
  },
  {
    f_name: "Lester",
    l_name: "Villarin",
    email: "seed.unassigned.operator3@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_003",
    profile_image: "default.png",
  },
  {
    f_name: "Rowena",
    l_name: "Dalisay",
    email: "seed.unassigned.operator4@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_004",
    profile_image: "default.png",
  },
  {
    f_name: "Stefan",
    l_name: "Santiago",
    email: "seed.unassigned.operator5@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_005",
    profile_image: "default.png",
  },
  {
    f_name: "Trisha",
    l_name: "Lozada",
    email: "seed.unassigned.operator6@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_006",
    profile_image: "default.png",
  },
  {
    f_name: "Virgil",
    l_name: "Acosta",
    email: "seed.unassigned.operator7@pasahero.local",
    password: "$2b$10$abcdefghijklmnopqrstuvwxyz",
    role: "operator",
    status: "active",
    firebase_id: "firebase_seed_unassigned_operator_007",
    profile_image: "default.png",
  },
];

export default async function seedUnassignedBusDriverOperator() {
  const terminal = await Terminal.findOne({
    terminal_name: "SM City Cebu Terminal",
  }).select("_id terminal_name");

  if (!terminal) {
    console.warn(
      '⚠️  Skipped unassigned bus/driver/operator seed: "SM City Cebu Terminal" not found.',
    );
    return null;
  }

  const bus = await Bus.findOneAndUpdate(
    { bus_number: UNASSIGNED_BUS.bus_number },
    { $setOnInsert: UNASSIGNED_BUS },
    { returnDocument: "after", upsert: true },
  );

  const drivers = await Promise.all(
    UNASSIGNED_DRIVERS.map((driverSeed) =>
      Driver.findOneAndUpdate(
        { license_number: driverSeed.license_number },
        { $setOnInsert: driverSeed },
        { returnDocument: "after", upsert: true },
      ),
    ),
  );

  const primaryDriver = drivers[0];

  const operators = await Promise.all(
    UNASSIGNED_OPERATORS.map((operatorSeed) =>
      User.findOneAndUpdate(
        { email: operatorSeed.email },
        {
          $setOnInsert: operatorSeed,
          $set: {
            assigned_terminal: terminal._id,
            created_by: null,
          },
        },
        { returnDocument: "after", upsert: true },
      ),
    ),
  );

  return { bus, drivers, operators, terminal };
}

