import seedData from "./allSchema.seeder.js";

const seedTerminals = async () => {
  console.log("ℹ️ Running terminals seeder entrypoint...");
  await seedData();
};

export default seedTerminals;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedTerminals();
}
