import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createTable } from "@/lib/game.functions";
import { saveSeat } from "@/lib/session";
import { EmojiPicker, Shell } from "@/components/ulterior/Shell";

export const Route = createFileRoute("/new")({
  head: () => ({
    meta: [
      { title: "Set the Table — ULTERIOR" },
      { name: "description", content: "Start a private ULTERIOR table and invite your dinner guests." },
      { property: "og:title", content: "Set the Table — ULTERIOR" },
      { property: "og:description", content: "Start a private table for tonight's dinner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewTable,
});

function NewTable() {
  const create = useServerFn(createTable);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await create({ data: { name, emoji } });
      if (!r.ok) return setError(r.error);
      saveSeat(r.data);
      navigate({ to: "/t/$code", params: { code: r.data.code } });
    } catch {
      setError("Something went sideways. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="flex flex-1 flex-col pt-14">
        <p className="eyebrow">Set the Table</p>
        <h1 className="display mt-4 text-5xl">What shall we call you?</h1>
        <input className="field mt-10" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} autoFocus />
        <p className="eyebrow mt-10 mb-4">A small token <span className="normal-case tracking-normal">(optional)</span></p>
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <p className="display mt-10 text-xl italic text-muted-foreground">You're playing too. The table can look after itself.</p>
        <div className="mt-auto pt-10">
          {error && <p className="mb-4 text-sm seal">{error}</p>}
          <button className="btn-primary" disabled={!name.trim() || busy}>{busy ? "Laying the cloth…" : "Open a Table"}</button>
        </div>
      </form>
    </Shell>
  );
}
