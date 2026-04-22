import seedData from "./allSchema.seeder.js";

const seedBusAssignments = async () => {
  console.log("ℹ️ Running bus assignments seeder entrypoint...");
  await seedData();
};

export default seedBusAssignments;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedBusAssignments();
}
