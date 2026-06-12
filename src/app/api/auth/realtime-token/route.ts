import { auth } from "@/lib/auth";
import { env } from "@/env";
import { SignJWT } from "jose";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const alg = "HS256";

    // Create a Supabase compatible JWT
    // Supabase expects the 'sub' to be the user's ID
    // and 'role' to be 'authenticated' or an appropriate Postgres role
    const jwt = await new SignJWT({
      role: "authenticated",
    })
      .setProtectedHeader({ alg, typ: "JWT" })
      .setSubject(session.user.id)
      .setJti(crypto.randomUUID())
      .setIssuer("supabase")
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    return new Response(JSON.stringify({ token: jwt }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("JWT Minting Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
