import seedData from "./allSchema.seeder.js";

const seedUsers = async () => {
  console.log("ℹ️ Running users seeder entrypoint...");
  await seedData();
};

export default seedUsers;

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedUsers();
}
