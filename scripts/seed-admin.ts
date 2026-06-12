import "./load-env";

import { db } from "../src/db";
import { users, workspaces, workspaceMembers } from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  try {
    console.log("Connecting to database and creating admin user...");

    // Create an admin user via better-auth API (which hashes passwords properly)
    // Wait, better-auth server auth API requires headers, which might be tricky in a script.
    // Let's use auth.api directly with fake headers or just insert via DB.
    // However, if we insert via DB, the password won't be hashed with better-auth's internal hasher easily.
    // The easiest way is to use better-auth's register API if possible, or just generate a hash.
    // Better auth exports a `signUp` method.
    // Let's use `auth.api.signUpEmail`!
    
    // Create random UUID for the new user if we do it via DB:
    const adminEmail = "admin@papanfokus.com";
    const adminPassword = process.env.GUEST_PASSWORD || "Password123!";
    const adminName = "Admin PapanFokus";

    // Clean up existing admin if it already exists from a failed run
    await db.delete(users).where(eq(users.email, adminEmail));

    const res = await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      }
    });

    if (res.user) {
      console.log(`✅ Admin user created: ${res.user.email}`);
      
      // Now create a demo workspace and assign the user as owner
      const workspaceId = uuidv4();
      await db.insert(workspaces).values({
        id: workspaceId,
        name: "Demo Workspace",
        slug: "demo",
        ownerId: res.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(workspaceMembers).values({
        workspaceId,
        userId: res.user.id,
        role: "admin",
        joinedAt: new Date(),
      });

      console.log(`✅ Demo workspace created and assigned!`);
      console.log("===============================");
      console.log("Login Credentials:");
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log("===============================");
    } else {
      console.log("Failed to create admin.", res);
    }

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAdmin();
