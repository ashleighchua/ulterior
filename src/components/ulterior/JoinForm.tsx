import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { joinTable } from "@/lib/game.functions";
import { saveSeat, type Seat } from "@/lib/session";
import { EmojiPicker } from "./Shell";

export function JoinForm({ initialCode, onSeated }: { initialCode?: string; onSeated: (s: Seat) => void }) {
  const join = useServerFn(joinTable);
  const [code, setCode] = useState(initialCode ?? "");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await join({ data: { code: code.trim().toUpperCase(), name, emoji } });
      if (!r.ok) return setError(r.error);
      saveSeat(r.data);
      onSeated(r.data);
    } catch {
      setError("Check the Table Code — four letters.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col pt-14">
      <p className="eyebrow">Take a Seat</p>
      <h1 className="display mt-4 text-5xl">Your seat is waiting.</h1>
      {!initialCode && (
        <>
          <label className="eyebrow mt-10 block">Table Code</label>
          <input
            className="field font-mono uppercase tracking-[0.4em]"
            placeholder="ABCD"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase())}
            autoFocus
            inputMode="text"
            autoCapitalize="characters"
          />
        </>
      )}
      {initialCode && <p className="mt-6 font-mono text-sm tracking-[0.4em] text-muted-foreground">TABLE {initialCode}</p>}
      <label className="eyebrow mt-10 block">Name</label>
      <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus={!!initialCode} />
      <p className="eyebrow mt-10 mb-4">A small token <span className="normal-case tracking-normal">(optional)</span></p>
      <EmojiPicker value={emoji} onChange={setEmoji} />
      <div className="mt-auto pt-10">
        {error && <p className="mb-4 text-sm seal">{error}</p>}
        <button className="btn-primary" disabled={code.length !== 4 || !name.trim() || busy}>{busy ? "Pulling out a chair…" : "Take a Seat"}</button>
      </div>
    </form>
  );
}
