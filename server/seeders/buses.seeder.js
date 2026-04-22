import seedData from "./allSchema.seeder.js";

const seedBuses = async () => {
  console.log("ℹ️ Running buses seeder entrypoint...");
  await seedData();
};

export default seedBuses;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedBuses();
}
