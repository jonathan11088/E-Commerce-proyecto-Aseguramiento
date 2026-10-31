import "reflect-metadata";
import { seedAdmin } from "./adminSeed";
import { seedTaxonomy } from "./taxonomySeed";
import { seedProducts } from "./productSeed";
import { AppDataSource } from "../config/data-source";

async function runSeeds(): Promise<void> {
  console.log("Connecting to database...");

  await AppDataSource.initialize();

  console.log("Connected. Running seeds...\n");

  try {
    console.log("Seeding admin user...");
    await seedAdmin();

    // Taxonomy must run before products because products depend on subcategories.
    console.log("Seeding taxonomy...");
    await seedTaxonomy();

    console.log("Seeding products...");
    await seedProducts();

    console.log("\nAll seeds completed successfully.");
  } catch (error) {
    console.error("Seed failed:", error);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

void runSeeds();
