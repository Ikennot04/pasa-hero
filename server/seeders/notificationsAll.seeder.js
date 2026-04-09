import seedData from "./allSchema.seeder.js";

const seedNotificationsAll = async () => {
  console.log("ℹ️ Running all notifications seeder entrypoint...");
  await seedData();
};

export default seedNotificationsAll;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedNotificationsAll();
}
