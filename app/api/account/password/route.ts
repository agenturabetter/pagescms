import { headers } from "next/headers";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accountTable } from "@/db/schema";

export const dynamic = "force-dynamic";

const passwordSchema = z.object({
  newPassword: z.string().min(12).max(128),
});

const getSessionAndCredential = async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { requestHeaders, session: null, credential: null };

  const credential = await db.query.accountTable.findFirst({
    where: and(
      eq(accountTable.userId, session.user.id),
      eq(accountTable.providerId, "credential"),
      isNotNull(accountTable.password),
    ),
    columns: { id: true },
  });

  return { requestHeaders, session, credential };
};

export async function GET() {
  const { session, credential } = await getSessionAndCredential();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ hasPassword: Boolean(credential) });
}

export async function POST(request: Request) {
  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Password must be between 12 and 128 characters." },
      { status: 400 },
    );
  }

  const { requestHeaders, session, credential } = await getSessionAndCredential();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (credential) {
    return Response.json(
      { error: "A password is already set for this account." },
      { status: 409 },
    );
  }

  try {
    await auth.api.setPassword({
      body: { newPassword: parsed.data.newPassword },
      headers: requestHeaders,
    });
    return Response.json({ status: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set password.";
    return Response.json({ error: message }, { status: 400 });
  }
}
