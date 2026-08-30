/**
 * Single-admin access check, reusing CRON_SECRET rather than adding a
 * second secret — this site has one admin (you) and one purpose (keeping
 * random visitors out of /admin), the same bar the cron endpoint already
 * clears. Not meant to scale beyond that.
 */
export function isValidAdminKey(key: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && key === secret;
}
