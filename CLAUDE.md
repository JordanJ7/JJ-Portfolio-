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
- **Never commit `private-src/` or any password.** The build tool reads passwords from `PRIVATE_PW1` and `PRIVATE_PW2`. Ask Jordan for them each time; do not store them anywhere in the repo, in comments, or in test files you add.
- Folder names are private: never render them in the public UI, never log them in the browser console, and keep them out of commit messages.
- There are three questions: a birthday, "My Child's Name", and "My Original Child". Jordan knows the answers; ask him for them when building and never write them into any file.
- Lockouts are in seconds: 7, then 11, repeating, after every 2 further wrong tries once the hint is showing.
- After the Back button, going forward again must skip the typed line, the montage, the TV-off and the folder animation (`CFG.returnSkips`).
- After any change to `private.js`, `private.css` or `index.html` there, run `python3 tests/private_flow.py` and make sure it ends with no errors and `folders ready` under 10 seconds.
- Keep the 4 x 4 settle time under 10 seconds even with collisions (`CFG.fold.settle` is the hard guarantee).

## Culture Log
- Covers are self-hosted via `tools/fetch-covers.mjs` (`site/assets/covers/` and `site/js/covers.js`). Do not hotlink images other than the Steam artwork already used for games.
- `RECENT` in `js/main.js` holds the newest-watched order from Queue. Refresh it from Queue's Watched tab when asked.

## Mareep
- Jordan approved Mareep at 80% size (`scale:.8`). Do not change its size, motion or sprite without asking. The sprite is his own image, scaled by whole pixels.
- The portfolio nav now shows a random buddy on each visit (`Buddy` in `site/js/main.js`): Mareep, Reshiram, Rayquaza, Latias and Jirachi, never the same one twice in a row. Jirachi sleeps until hovered or tapped and dozes off 5s after. Sprites live in `site/assets/sprites/`. Add `?buddy=<id>` to the URL to pick one.
- Giratina sometimes flies across the page (`window.__fly`): 45% chance per load after 8-30s, 30% chance of a return visit. Add `?fly=1` to force a flight. Neither runs with reduced motion. The special site keeps Mareep only.
- Portfolio: next to his name in the nav, links to `special/`. Special site: fixed top-left, links to `../`. On the special site it hides during the montage and TV-off, and the Back button sits beside it.
