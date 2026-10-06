import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/ulterior/Shell";
import { HowToPlay } from "@/components/ulterior/HowToPlay";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play — ULTERIOR" },
      { name: "description", content: "Secret missions at dinner. Do yours, spot theirs. Learn ULTERIOR in a minute." },
      { property: "og:title", content: "How to Play — ULTERIOR" },
      { property: "og:description", content: "Secret missions at dinner. Do yours, spot theirs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowToPlayPage,
});

function HowToPlayPage() {
  const navigate = useNavigate();
  return (
    <Shell>
      <HowToPlay onDone={() => navigate({ to: "/" })} doneLabel="Let's play" />
    </Shell>
  );
}
