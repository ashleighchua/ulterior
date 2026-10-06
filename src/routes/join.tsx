import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/ulterior/Shell";
import { JoinForm } from "@/components/ulterior/JoinForm";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Take a Seat — ULTERIOR" },
      { name: "description", content: "Join an ULTERIOR table with a four-letter Table Code." },
      { property: "og:title", content: "Take a Seat — ULTERIOR" },
      { property: "og:description", content: "Enter your Table Code and take a seat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Join,
});

function Join() {
  const navigate = useNavigate();
  return (
    <Shell>
      <JoinForm onSeated={(s) => navigate({ to: "/t/$code", params: { code: s.code } })} />
    </Shell>
  );
}
