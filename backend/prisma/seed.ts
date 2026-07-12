/**
 * Prisma seed script.
 *
 * Foundation only - no domain data is seeded yet. Seed logic is introduced
 * in later prompts once the schema is defined.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Domain seeding will be implemented in later prompts.
  console.log('Seed placeholder: no data to seed yet.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
