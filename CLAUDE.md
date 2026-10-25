# CLAUDE.md

Project: Jordan James's personal portfolio. Static site, no build step, vanilla ES modules. Deployed on GitHub Pages from `docs/` on `main` (repo: JordanJ7/JJ-Portfolio-). In this package the site lives in `site/`.

## Rules for working here
- Keep it dependency-free. No frameworks, bundlers, or npm packages for the site itself.
- Content lives in `site/js/data.js`. Behavior lives in `site/js/main.js`. Styles live in `site/css/styles.css`.
- Palette is black and pink. Use the CSS variables (`--black`, `--panel`, `--line`, `--pink`, `--soft`). Do not reintroduce blue, yellow, or other accent colors.
- Projects are listed newest first, each with a `date`. Keep that order. The hero, tiles, Work menu and previous/next links all derive from the order of `P`.
- Media must be optimized (`tools/optimize.sh`) and registered in `MEDIA` with `w` and `h` (and `poster` for video) so layout does not shift.
- Do not use remote images or hotlink third-party assets. Fonts come from Google Fonts with a system fallback stack.
- Accessibility matters: keep the CD case keyboard-operable (Enter/Space), keep `aria-label`s, keep the lightbox keyboard accessible.
- Before finishing any change, run `python3 tests/audit.py http://localhost:8000/` and make sure it reports `TOTAL ISSUES 0`.

## Content and privacy rules
- The public resume page intentionally omits Jordan's phone number. Do not add it.
- Do not add personal details beyond what is already on the site (no addresses, finances, health, or family details).
- FLX Edits uses studio film footage. Keep the clips short, and keep the credit line that says so. Prefer linking to Instagram over embedding more footage.
- The Music section (`MUSIC` in `js/data.js`) is a snapshot of Apple Music Replay read on Oct 21, 2026: top 20 artists, 40 songs and 15 albums per year for 2018 to 2025 (Replay holds up to ~100 songs per year), and 2026 by month through September. The All view adds the yearly lists together at runtime. Refresh it each year when the new Replay appears.
- `WATCH` in `js/data.js` holds Jordan's Queue watched list (790 titles, snapshot Oct 2026) by rating: love, like, meh, dislike, none. A `~` prefix marks a TV show. Refresh it from Queue when asked.
- `PSN` in `js/data.js` is Jordan's PlayStation list (146 games with trophies, from PSNProfiles, Oct 2026). Valorant and League stats (tracker.gg, Oct 2026) are typed into the `LOG` entries in `js/main.js`. psnprofiles.com and tracker.gg block automated fetching, so refresh them in a real browser.
- The Culture Log Steam data is a snapshot from Oct 13, 2026 (hours, last played, achievements). It was read from a screen recording and may contain small mistakes. Refresh it by editing `STEAM`.

## Open items (waiting on Jordan)
- This Is Animation: storyboard and Sony certificate images (the old site's copies are gone).
- Journal-101: screenshots of the app.
- Confirm the public email, the "starting the AI Engineering master's in January" line in About, and the project dates for Generative Art and Solar System (set to Fall 2024).

## Useful commands
```bash
cd site && python3 -m http.server 8000      # preview
python3 tests/audit.py http://localhost:8000/   # checks
```

## The special site (`site/special/`)
- It is a personal gift page. Do not link to it from the portfolio, do not add it to a sitemap, and keep `noindex`.
- **Never commit `private-src/` or any password.** Passwords and answers come from the environment (`PW1`-`PW3`, `EDPW` for tests). Ask Jordan for them each time; do not store them anywhere in the repo, in comments, or in test files you add.
- Content is now edited by Jordan in the **page editor** (pencil button, bottom-left of the first password page, editor password). It publishes by committing `docs/special/vault.json` and `docs/special/media/*.enc` with his own GitHub token. `tools/build-private.mjs` is retired (it wrote the old v1 vault); `tools/vault2.mjs` was the one-time upgrade to v2.
- Vault v2: each question has a random secret wrapped once per accepted answer; all secrets together unlock the content key (`kw`); the editor password unlocks the same key (`ke`). The secrets live inside the encrypted content (`_secrets`) so one answer can change without the others. Media never needs re-encrypting when answers change.
- Only Mareep in the portfolio nav links to the special site; the other buddies are decoration.
- Folder names are private: never render them in the public UI, never log them in the browser console, and keep them out of commit messages.
- The questions, prompts, hints and how many there are come from the vault (editable in the editor). Today there are four ("Our B-day", "Our First Child", "and the second one...?", "My Original Child"), and Earth has its own date password ("The Date We Started Dating"). Never write the answers into any file. Tests read them from PW1-PW4, EARTHPW and EDPW.
- Lockouts are in seconds: 7, then 11, repeating, after every 2 further wrong tries once the hint is showing.
- After the Back button, going forward again must skip the typed line, the montage, the TV-off and the folder animation (`CFG.returnSkips`).
- After any change to `private.js`, `private.css`, `editor.js` or `index.html` there, run `tests/private_flow.py`, `tests/private_world.py` and `tests/private_editor.py` (the editor test publishes to a fake GitHub only).
- Keep the folder settle time under 10 seconds even with collisions (`CFG.fold.settle` is the hard guarantee). The folder count comes from the content.
- The Earth on the folders page flies to 42.115744, -79.983994 and holds plain paper for 2 s, draws the heart map (an encrypted vector JSON, not a photo) from five starting points in about 14 s, waits 4 s, then blurs it behind the books. Slides default to baby blue (#8fb8e6) with bone-white text. The flight renders a lit globe from `docs/special/earth.json` (Natural Earth land and lakes, public domain, via world-atlas, ISC) in three levels of detail built on a worker; Deoxys (`docs/special/deoxys.png`) and Rayquaza fly across during it. Books: "Read Me When You Need Me- From You" (her pages from the journal's Book Talk folder, scanned, with prompt and caption), "What I Love About You", "Read Me When You Need Me -From Me" (same page numbers and prompts, scans to come), and "Everything About You" (colour-coded sections instead of page numbers; stand-in cover until the real photo is added). The reader's Glossary jumps to a page (numbered books) or a section (sectioned book).

## Culture Log
- Covers are self-hosted via `tools/fetch-covers.mjs` (`site/assets/covers/` and `site/js/covers.js`). Do not hotlink images other than the Steam artwork already used for games.
- `RECENT` in `js/main.js` holds the newest-watched order from Queue. Refresh it from Queue's Watched tab when asked.

## Mareep
- Jordan approved Mareep at 80% size (`scale:.8`). Do not change its size, motion or sprite without asking. The sprite is his own image, scaled by whole pixels.
- The portfolio nav now shows a random buddy on every page load and every page change (`Buddy` in `site/js/main.js`): Mareep, Reshiram, Rayquaza, Latias and Jirachi, never the same one twice in a row. Jirachi sleeps until hovered or tapped and dozes off 5s after. Sprites live in `site/assets/sprites/`. Add `?buddy=<id>` to the URL to pick the first one (page changes still swap it).
- Giratina sometimes flies across the page (`window.__fly`): 45% chance per load after 8-30s, 30% chance of a return visit. Add `?fly=1` to force a flight. Neither runs with reduced motion. The special site keeps Mareep only.
- Portfolio: next to his name in the nav, links to `special/`. Special site: fixed top-left, links to `../`. On the special site it hides during the montage and TV-off, and the Back button sits beside it.
