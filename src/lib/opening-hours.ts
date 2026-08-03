export type OpeningPeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

export type OpeningHours = {
  openNow?: boolean;
  weekdayDescriptions?: string[];
  periods?: OpeningPeriod[];
};

const CITY_TZ: Record<string, string> = {
  Sydney: "Australia/Sydney",
  Melbourne: "Australia/Melbourne",
  Brisbane: "Australia/Brisbane",
  Perth: "Australia/Perth",
  Adelaide: "Australia/Adelaide",
  Hobart: "Australia/Hobart",
};

export function parseOpeningHours(raw: string | null | undefined): OpeningHours | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const hours: OpeningHours = {};
    if (typeof obj.openNow === "boolean") hours.openNow = obj.openNow;
    if (Array.isArray(obj.weekdayDescriptions)) {
      hours.weekdayDescriptions = obj.weekdayDescriptions.filter(
        (v): v is string => typeof v === "string",
      );
    }
    if (Array.isArray(obj.periods)) {
      hours.periods = obj.periods.flatMap((period) => {
        if (!period || typeof period !== "object") return [];
        const p = period as Record<string, unknown>;
        if (!p.open || typeof p.open !== "object") return [];
        const open = p.open as Record<string, unknown>;
        if (
          typeof open.day !== "number" ||
          typeof open.hour !== "number" ||
          typeof open.minute !== "number"
        ) {
          return [];
        }
        const entry: OpeningPeriod = {
          open: { day: open.day, hour: open.hour, minute: open.minute },
        };
        if (p.close && typeof p.close === "object") {
          const close = p.close as Record<string, unknown>;
          if (
            typeof close.day === "number" &&
            typeof close.hour === "number" &&
            typeof close.minute === "number"
          ) {
            entry.close = {
              day: close.day,
              hour: close.hour,
              minute: close.minute,
            };
          }
        }
        return [entry];
      });
    }
    return hours;
  } catch {
    return null;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { day: dayMap[weekday] ?? 0, hour, minute };
}

function minutesSinceSunday(day: number, hour: number, minute: number) {
  return day * 24 * 60 + hour * 60 + minute;
}

/** Compute open-now from stored Places periods + city timezone. Falls back to `isOpen` flag. */
export function isOpenNow(input: {
  openingHoursJson?: string | null;
  isOpen: boolean;
  city: string;
  now?: Date;
}): boolean {
  const hours = parseOpeningHours(input.openingHoursJson);
  if (!hours?.periods?.length) return input.isOpen;

  const tz = CITY_TZ[input.city] ?? "Australia/Sydney";
  const now = input.now ?? new Date();
  const { day, hour, minute } = zonedParts(now, tz);
  const nowMins = minutesSinceSunday(day, hour, minute);

  for (const period of hours.periods) {
    if (!period.open || !period.close) {
      // Open 24h that day
      if (period.open && !period.close && period.open.day === day) return true;
      continue;
    }
    const openMins = minutesSinceSunday(
      period.open.day,
      period.open.hour,
      period.open.minute,
    );
    let closeMins = minutesSinceSunday(
      period.close.day,
      period.close.hour,
      period.close.minute,
    );
    if (closeMins <= openMins) closeMins += 7 * 24 * 60;
    let cursor = nowMins;
    if (cursor < openMins) cursor += 7 * 24 * 60;
    if (cursor >= openMins && cursor < closeMins) return true;
  }
  return false;
}

export function formatHoursSummary(openingHoursJson?: string | null): string | null {
  const hours = parseOpeningHours(openingHoursJson);
  if (!hours?.weekdayDescriptions?.length) return null;
  const todayIdx = new Date().getDay();
  // Google weekdayDescriptions usually Mon–Sun; map Sun=0 → index 6
  const googleIdx = todayIdx === 0 ? 6 : todayIdx - 1;
  return hours.weekdayDescriptions[googleIdx] ?? hours.weekdayDescriptions[0] ?? null;
}
