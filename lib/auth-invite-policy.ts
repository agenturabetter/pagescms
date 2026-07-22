import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  collaboratorInviteTable,
  collaboratorTable,
  userTable,
} from "@/db/schema";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const userExistsForEmail = async (email: string) => {
  const user = await db.query.userTable.findFirst({
    where: sql`lower(${userTable.email}) = lower(${normalizeEmail(email)})`,
    columns: { id: true },
  });

  return Boolean(user);
};

const hasValidInviteForEmail = async (email: string, token?: string | null) => {
  if (!token) return false;

  const normalizedEmail = normalizeEmail(email);
  const invite = await db.query.collaboratorInviteTable.findFirst({
    where: and(
      eq(collaboratorInviteTable.token, token),
      gt(collaboratorInviteTable.expiresAt, new Date()),
      sql`lower(${collaboratorInviteTable.email}) = lower(${normalizedEmail})`,
    ),
  });

  if (!invite) return false;

  const collaborator = await db.query.collaboratorTable.findFirst({
    where: and(
      sql`lower(${collaboratorTable.email}) = lower(${normalizedEmail})`,
      sql`lower(${collaboratorTable.owner}) = lower(${invite.owner})`,
      sql`lower(${collaboratorTable.repo}) = lower(${invite.repo})`,
    ),
    columns: { id: true },
  });

  return Boolean(collaborator);
};

export { hasValidInviteForEmail, userExistsForEmail };
