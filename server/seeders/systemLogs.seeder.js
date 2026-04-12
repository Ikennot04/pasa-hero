import seedData from "./allSchema.seeder.js";

const seedSystemLogs = async () => {
  console.log("ℹ️ Running system logs seeder entrypoint...");
  await seedData();
};

export default seedSystemLogs;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedSystemLogs();
}
