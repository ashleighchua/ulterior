import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Shell({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="wordmark text-sm text-muted-foreground hover:text-foreground">Ulterior</Link>
        {top}
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

export const EMOJIS = ["🕯️", "🍷", "🫒", "🥂", "🍋", "🦪", "🌙", "🗝️", "🎩", "🃏", "🪞", "🦚"];

export function EmojiPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(value === e ? null : e)}
          data-on={value === e}
          className="choice justify-center p-2 text-xl"
          aria-label={`Choose ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ emoji, name, size = "md" }: { emoji: string | null; name: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-8 w-8 text-sm" : "h-10 w-10 text-lg";
  return (
    <span className={`inline-flex ${s} shrink-0 items-center justify-center rounded-full border border-hairline bg-card`}>
      {emoji ?? <span className="display text-base">{name.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}
