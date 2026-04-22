import seedData from "./allSchema.seeder.js";

const seedUserNotifications = async () => {
  console.log("ℹ️ Running user notifications seeder entrypoint...");
  await seedData();
};

export default seedUserNotifications;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedUserNotifications();
}
