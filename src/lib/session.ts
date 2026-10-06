// Temporary seat identity per table, kept on this device only.
export interface Seat { code: string; playerId: string; token: string }

const key = (code: string) => `ulterior:seat:${code.toUpperCase()}`;

export function loadSeat(code: string): Seat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as Seat) : null;
  } catch {
    return null;
  }
}
export function saveSeat(seat: Seat) {
  localStorage.setItem(key(seat.code), JSON.stringify(seat));
}
export function clearSeat(code: string) {
  localStorage.removeItem(key(code));
}
export function localFlag(code: string, name: string) {
  const k = `ulterior:${code}:${name}`;
  return {
    get: () => (typeof window !== "undefined" ? localStorage.getItem(k) : null),
    set: (v: string) => localStorage.setItem(k, v),
  };
}
