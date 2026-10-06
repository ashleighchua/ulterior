import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/ulterior/Shell";
import { JoinForm } from "@/components/ulterior/JoinForm";
import { Game } from "@/components/ulterior/Game";
import { loadSeat, type Seat } from "@/lib/session";

export const Route = createFileRoute("/t/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Table ${params.code.toUpperCase()} — ULTERIOR` },
      { name: "description", content: "You've been invited to an ULTERIOR table. Take a seat." },
      { property: "og:title", content: "You've been invited to the table — ULTERIOR" },
      { property: "og:description", content: "Everyone has an agenda. Not everyone has the same one." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TablePage,
});

function TablePage() {
  const code = Route.useParams().code.toUpperCase();
  const [seat, setSeat] = useState<Seat | null | undefined>(undefined);
  useEffect(() => setSeat(loadSeat(code)), [code]);

  if (seat === undefined) return <Shell><div className="flex-1" /></Shell>;
  if (!seat) return <Shell><JoinForm initialCode={code} onSeated={setSeat} /></Shell>;
  return <Game seat={seat} onLost={() => setSeat(null)} />;
}
