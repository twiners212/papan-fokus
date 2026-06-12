"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function ensureGuestUserAction() {
  try {
    // Check if the guest user already exists
    const guestUser = await db.query.users.findFirst({
      where: eq(users.email, "guest@papanfokus.com"),
    });

    if (!guestUser) {
      // Create guest user via Better Auth programmatic API to correctly create user & account credentials
      await auth.api.signUpEmail({
        body: {
          email: "guest@papanfokus.com",
          password: "Password123!",
          name: "Tamu PapanFokus",
        },
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error ensuring guest user:", error);
    return { success: false, error: error.message || "Failed to prepare guest account" };
  }
}
