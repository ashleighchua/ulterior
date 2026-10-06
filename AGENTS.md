<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## ULTERIOR architecture
- Players have no accounts: each seat gets a random token (hash stored in `player_secrets`); every private read/write goes through server functions in `src/lib/game.functions.ts` that verify the token — keeps Motives/Agendas unreadable from the browser.
- Only `game_tables` and `players` are publicly readable (for realtime); all secret tables have no anon/authenticated grants.
- Game state advances lazily and idempotently in `advance()` (guarded updates on status), triggered by any client — no host or cron needed.
- Timings, Motive balancing and scoring live only in `src/lib/game/config.ts`; the Agenda library lives in `src/lib/game/agendas.ts`.
