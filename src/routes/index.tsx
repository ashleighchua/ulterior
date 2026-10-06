import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ULTERIOR — Everyone has an agenda" },
      { name: "description", content: "A dinner-party game for 4–12 friends. Secret missions at dinner. Do yours, spot theirs." },
      { property: "og:title", content: "ULTERIOR — Everyone has an agenda" },
      { property: "og:description", content: "Everyone has an agenda. Not everyone has the same one." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-12 pt-16">
      <div className="flex flex-1 flex-col justify-center">
        <p className="eyebrow animate-rise">A game for one dinner</p>
        <h1 className="wordmark animate-curtain mt-8 text-[3.4rem] leading-none sm:text-6xl">Ulterior</h1>
        <div className="mt-10 h-px w-16 bg-claret" />
        <p className="display animate-rise mt-10 text-3xl italic text-foreground/90" style={{ animationDelay: ".4s" }}>
          Everyone has an agenda.
          <br />
          <span className="text-muted-foreground">Not everyone has the same one.</span>
        </p>
        <p className="animate-rise mt-8 text-sm text-muted-foreground" style={{ animationDelay: ".6s" }}>
          Secret missions at dinner. Do yours, spot theirs. For 4–12 people, one phone each.
        </p>
      </div>
      <div className="animate-rise flex flex-col gap-3" style={{ animationDelay: ".8s" }}>
        <Link to="/new" className="btn-primary">Set the Table</Link>
        <Link to="/join" className="btn-ghost">Take a Seat</Link>
        <Link to="/how-to-play" className="link-quiet mt-3 self-center">How to play</Link>
      </div>
    </div>
  );
}
