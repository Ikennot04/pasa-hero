import { fileURLToPath } from "url";

const schemaToSeederPath = {
  users: "./users.seeder.js",
  terminals: "./terminals.seeder.js",
  routes: "./routes.seeder.js",
  routeStops: "./routeStops.seeder.js",
  buses: "./buses.seeder.js",
  drivers: "./drivers.seeder.js",
  userSubscriptions: "./userSubscriptions.seeder.js",
  busAssignments: "./busAssignments.seeder.js",
  notificationsAll: "./notificationsAll.seeder.js",
  userNotifications: "./userNotifications.seeder.js",
  systemLogs: "./systemLogs.seeder.js",
};

const schema = process.argv[2];

if (!schema || !schemaToSeederPath[schema]) {
  console.error("❌ Invalid or missing schema name.");
  console.error("Available schemas:");
  Object.keys(schemaToSeederPath).forEach((name) => console.error(`- ${name}`));
  process.exit(1);
}

const modulePath = schemaToSeederPath[schema];
const seederModule = await import(modulePath);
const seedFn = seederModule.default;

if (typeof seedFn !== "function") {
  console.error(`❌ Seeder does not export default function: ${modulePath}`);
  process.exit(1);
}

await seedFn();

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && __filename === process.argv[1];

if (!isDirectRun) {
  process.exit(0);
}
