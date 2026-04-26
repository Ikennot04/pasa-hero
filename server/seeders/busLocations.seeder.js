import seedData from "./allSchema.seeder.js";

const seedBusLocations = async () => {
  console.log("ℹ️ Running bus locations seeder entrypoint...");
  await seedData();
};

export default seedBusLocations;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedBusLocations();
}
