const TIME_ZONE = "Asia/Jerusalem";

export type PayupIntroTiming =
  | { eligibleNow: true; scheduledFor: null }
  | { eligibleNow: false; scheduledFor: string };

type JerusalemParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  ymd: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function jerusalemParts(date: Date): JerusalemParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);

  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  let hour = Number(pick("hour"));
  if (hour === 24) hour = 0;
  const year = Number(pick("year"));
  const month = Number(pick("month"));
  const day = Number(pick("day"));
  const minute = Number(pick("minute"));
  const weekday = WEEKDAY_INDEX[pick("weekday")] ?? 0;

  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday,
    ymd: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function addGregorianDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return next.toISOString().slice(0, 10);
}

function weekdayOfYmd(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

const ISRAEL_YOM_TOV_OR_EREV = new Set<string>([
  "2025-04-11","2025-04-12","2025-04-18","2025-05-31","2025-06-01",
  "2025-09-21","2025-09-22","2025-09-23","2025-09-30","2025-10-01","2025-10-05","2025-10-06","2025-10-13",
  "2026-03-31","2026-04-01","2026-04-07","2026-05-20","2026-05-21",
  "2026-09-10","2026-09-11","2026-09-12","2026-09-19","2026-09-20","2026-09-24","2026-09-25","2026-10-02",
  "2027-04-20","2027-04-21","2027-04-27","2027-06-09","2027-06-10",
  "2027-09-30","2027-10-01","2027-10-02","2027-10-09","2027-10-10","2027-10-14","2027-10-15","2027-10-22",
  "2028-04-09","2028-04-10","2028-04-16","2028-05-29","2028-05-30",
  "2028-09-19","2028-09-20","2028-09-21","2028-09-28","2028-09-29","2028-10-03","2028-10-04","2028-10-11",
  "2029-03-29","2029-03-30","2029-04-05","2029-05-18","2029-05-19",
  "2029-09-08","2029-09-09","2029-09-10","2029-09-17","2029-09-18","2029-09-22","2029-09-23","2029-09-30",
  "2030-04-16","2030-04-17","2030-04-23","2030-06-05","2030-06-06",
  "2030-09-26","2030-09-27","2030-09-28","2030-10-05","2030-10-06","2030-10-10","2030-10-11","2030-10-18",
  "2031-04-06","2031-04-07","2031-04-13","2031-05-26","2031-05-27",
  "2031-09-16","2031-09-17","2031-09-18","2031-09-25","2031-09-26","2031-09-30","2031-10-01","2031-10-08",
  "2032-03-25","2032-03-26","2032-04-01","2032-05-14","2032-05-15",
  "2032-09-04","2032-09-05","2032-09-06","2032-09-13","2032-09-14","2032-09-18","2032-09-19","2032-09-26",
]);

export function isIsraelYomTovOrErev(ymd: string): boolean {
  return ISRAEL_YOM_TOV_OR_EREV.has(ymd);
}

export function isPayupIntroBlockedDay(ymd: string, weekday = weekdayOfYmd(ymd)): boolean {
  if (weekday === 5 || weekday === 6) {
    return true;
  }
  return isIsraelYomTovOrErev(ymd);
}

function nextAllowedYmd(startYmd: string): string {
  let cursor = startYmd;
  for (let i = 0; i < 21; i += 1) {
    cursor = addGregorianDays(cursor, 1);
    if (!isPayupIntroBlockedDay(cursor)) {
      return cursor;
    }
  }
  throw new Error("No allowed payup_intro day found within 21 days.");
}

function jerusalemLocalToUtc(ymd: string, hour: number, minute: number): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour - 3, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = jerusalemParts(new Date(utcMs));
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const wanted = Date.UTC(year, month - 1, day, hour, minute);
    utcMs += wanted - actual;
  }
  return new Date(utcMs);
}

/**
 * payup_intro only.
 * Sunday–Thursday 09:00–20:00 Asia/Jerusalem, excluding Yom Tov and Erev Yom Tov.
 */
export function resolvePayupIntroTiming(now: Date = new Date()): PayupIntroTiming {
  const parts = jerusalemParts(now);
  const minutes = parts.hour * 60 + parts.minute;
  const blocked = isPayupIntroBlockedDay(parts.ymd, parts.weekday);
  const insideWindow = !blocked && minutes >= 9 * 60 && minutes <= 20 * 60;

  if (insideWindow) {
    return { eligibleNow: true, scheduledFor: null };
  }

  const targetYmd = blocked || minutes > 20 * 60 ? nextAllowedYmd(parts.ymd) : parts.ymd;
  return {
    eligibleNow: false,
    scheduledFor: jerusalemLocalToUtc(targetYmd, 10, 0).toISOString(),
  };
}

export function jerusalemClock(date: Date): { ymd: string; hour: number; minute: number; weekday: number } {
  const parts = jerusalemParts(date);
  return { ymd: parts.ymd, hour: parts.hour, minute: parts.minute, weekday: parts.weekday };
}
