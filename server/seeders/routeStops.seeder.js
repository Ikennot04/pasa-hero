import seedData from "./allSchema.seeder.js";

const seedRouteStops = async () => {
  console.log("ℹ️ Running route stops seeder entrypoint...");
  await seedData();
};

export default seedRouteStops;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedRouteStops();
}
