import seedData from "./allSchema.seeder.js";

const seedUserSubscriptions = async () => {
  console.log("ℹ️ Running user subscriptions seeder entrypoint...");
  await seedData();
};

export default seedUserSubscriptions;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedUserSubscriptions();
}
