/**
 * Wire this function to your Base44 server session API.
 *
 * Requirements:
 * - Return the canonical Base44 user id for the **current logged-in caller**
 * - Throw or return rejected promise if there is no authenticated session
 * - Do NOT read user id from client request body/query
 *
 * Example (replace with your platform API):
 *
 *   import { getCurrentUser } from "@base44/sdk/server";
 *   export async function resolveCurrentBase44UserId(): Promise<string> {
 *     const user = await getCurrentUser();
 *     if (!user?.id) throw new Error("NOT_AUTHENTICATED");
 *     return user.id;
 *   }
 */
export async function resolveCurrentBase44UserId(): Promise<string> {
  throw new Error(
    "resolveCurrentBase44UserId is not wired. Implement in integrations/base44/server/resolveCurrentBase44UserId.ts using your Base44 server session API.",
  );
}
