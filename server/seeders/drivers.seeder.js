import seedData from "./allSchema.seeder.js";

const seedDrivers = async () => {
  console.log("ℹ️ Running drivers seeder entrypoint...");
  await seedData();
};

export default seedDrivers;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedDrivers();
}
