import { closeDatabase, db, user } from "./index";
import { eq } from "drizzle-orm";

const email = process.argv[2]?.trim().toLowerCase();

try {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Pass the email address of an existing account to grant MES administrator access.");
  }
  const [updated] = await db.update(user).set({ mesRole: "ADMIN", banned: false, updatedAt: new Date() }).where(eq(user.email, email)).returning({ name: user.name, email: user.email });
  if (!updated) throw new Error(`No registered account was found for ${email}. Create that account first, then run this command again.`);
  console.log(`MES administrator access granted to ${updated.name} (${updated.email}).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to grant administrator access.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
