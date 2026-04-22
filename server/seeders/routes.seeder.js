import seedData from "./allSchema.seeder.js";

const seedRoutes = async () => {
  console.log("ℹ️ Running routes seeder entrypoint...");
  await seedData();
};

export default seedRoutes;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedRoutes();
}
