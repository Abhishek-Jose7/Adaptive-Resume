import { SQL, and, eq, isNull, sql } from "drizzle-orm";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";

/**
 * Tenant scoping utility to guarantee every database operation is bound to a verified userId.
 * Section 6.1 A2, 7.10, and 9.4 of PRD.md
 */

export interface TenantScoped {
  userId: string;
}

export function assertValidUserId(userId: unknown): asserts userId is string {
  if (typeof userId !== "string" || userId.trim() === "") {
    throw new Error("Security Violation: Operation attempted without a valid tenant userId");
  }
}

/**
 * Generates an SQL predicate ensuring both tenant ownership and active (non-soft-deleted) state.
 */
export function tenantActiveFilter(
  userIdColumn: PgColumn,
  deletedAtColumn: PgColumn,
  userId: string,
  extraCondition?: SQL
): SQL {
  assertValidUserId(userId);
  const conditions: SQL[] = [eq(userIdColumn, userId), isNull(deletedAtColumn)];
  if (extraCondition) {
    conditions.push(extraCondition);
  }
  return and(...conditions)!;
}

/**
 * Generates an SQL predicate strictly binding a row to the tenant userId.
 */
export function tenantFilter(
  userIdColumn: PgColumn,
  userId: string,
  extraCondition?: SQL
): SQL {
  assertValidUserId(userId);
  const conditions: SQL[] = [eq(userIdColumn, userId)];
  if (extraCondition) {
    conditions.push(extraCondition);
  }
  return and(...conditions)!;
}
