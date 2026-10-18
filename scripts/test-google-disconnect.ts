/**
 * Disconnect policy tests — no network, no database, no patient data.
 * Run: npx tsx scripts/test-google-disconnect.ts
 */

import { disconnectGoogleCalendarForTherapist } from "../src/core/google/calendar";
import type { GoogleCalendarConnection } from "../src/core/google/connections";

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

const connection: GoogleCalendarConnection = {
  therapistAccountId: "therapist-1",
  googleEmail: null,
  refreshToken: "refresh-token",
  accessToken: "access-token",
  accessTokenExpiresAt: null,
  scopes: "https://www.googleapis.com/auth/calendar.readonly",
  connectedAt: "2026-10-18T08:01:38.000Z",
  selectedCalendarId: "primary",
  selectedCalendarSummary: "Adam's Main Calendar",
};

async function main(): Promise<void> {
  {
    let deleted = false;
    let revoked = false;
    const result = await disconnectGoogleCalendarForTherapist("therapist-1", {
      getConnection: async () => connection,
      revoke: async () => {
        revoked = true;
      },
      deleteConnection: async () => {
        deleted = true;
      },
    });
    assert(revoked && deleted, "A: successful revoke still clears the local connection");
    assert(result.disconnected && result.googleRevocation === "revoked", "A: reports Google revocation");
    assert(result.userMessage === null, "A: no warning when Google revoke succeeds");
  }

  {
    let deleted = false;
    const result = await disconnectGoogleCalendarForTherapist("therapist-1", {
      getConnection: async () => connection,
      revoke: async () => {
        throw new Error('400 {"error":"invalid_token"}');
      },
      deleteConnection: async () => {
        deleted = true;
      },
    });
    assert(deleted, "B: invalid_token revoke still clears local credentials");
    assert(result.googleRevocation === "failed", "B: does not claim Google revocation");
    assert(
      result.userMessage === "היומן נותק ב-PayUp. ביטול הגישה ב-Google לא הושלם.",
      "B: truthful local-disconnect message",
    );
  }

  {
    let deleted = false;
    let revoked = false;
    const result = await disconnectGoogleCalendarForTherapist("therapist-1", {
      getConnection: async () => null,
      revoke: async () => {
        revoked = true;
      },
      deleteConnection: async () => {
        deleted = true;
      },
    });
    assert(!revoked && !deleted, "C: already disconnected does not call Google or delete");
    assert(result.alreadyDisconnected && result.googleRevocation === "skipped", "C: idempotent success");
  }

  {
    let thrown = false;
    try {
      await disconnectGoogleCalendarForTherapist("therapist-1", {
        getConnection: async () => connection,
        revoke: async () => {
          throw new Error("network");
        },
        deleteConnection: async () => {
          throw new Error("google_calendar_connections delete failed: db");
        },
      });
    } catch {
      thrown = true;
    }
    assert(thrown, "D: local delete failure still fails the request");
  }

  if (failures > 0) {
    console.error(`${failures} failed`);
    process.exit(1);
  }

  console.log("google disconnect policy: all passed");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
