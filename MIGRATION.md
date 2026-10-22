# Replacing the old site

Goal: the new site becomes https://jordanj7.github.io/JJ-Portfolio-/ with nothing lost and an easy way back.

## What happens to the old files
- Everything stays where it is (old project pages, `pics/`, `DIGIT400/`, and so on). Old project pages keep working, and the new Solar System page still links to `DIGIT400Project.html`.
- `index.html` is replaced by the new site.
- `certs.html`, `resume.html`, `Resume.html` and `InternBlog.html` become small redirects to the new pages (`#/certifications`, `#/resume`, `#/intern-blog`), so old links and LinkedIn links still land somewhere useful.
- Copies of the old versions are kept as `legacy-index.html`, `legacy-certs.html` and `legacy-InternBlog.html`. The old résumé copies and images were removed in October 2026 when the résumé was updated; they are still in the `v1-legacy` tag.

## Steps
1. **Check where Pages publishes from.** Repo > Settings > Pages. The old site appears to be served from `main` and the `/docs` folder. If yours is different, tell Claude Code before continuing.
2. **Run the script** from the repo root:
   ```bash
   bash path/to/jj-portfolio-v2/migrate.sh path/to/jj-portfolio-v2/site
   ```
   It creates a backup branch (`legacy-site-backup`), a tag (`v1-legacy`), a working branch (`site-v2`), keeps legacy copies, and copies in the new site. It pushes nothing.
3. **Preview**: `python3 -m http.server -d docs 8000`, then open http://localhost:8000/ and click through every page.
4. **Test**: `python3 tests/audit.py http://localhost:8000/` should end with `TOTAL ISSUES 0`.
5. **Back up, then publish**:
   ```bash
   git add -A && git commit -m "Launch portfolio v2"
   git push origin legacy-site-backup v1-legacy
   git push -u origin site-v2
   ```
   Open a pull request into `main`, check it once more, and merge. Pages rebuilds in a minute or two.
6. **Verify live** (give Pages a minute or two to rebuild, then hard-refresh): run `python3 tests/audit.py https://jordanj7.github.io/JJ-Portfolio-/` and expect `TOTAL ISSUES 0`; then open the live site on your phone and desktop and also the `/special/` address.
   Also: open the live URL on your phone and desktop, then click the old links (`/certs.html`, `/resume.html`, `/InternBlog.html`) to confirm they redirect.

## Rollback
If anything is wrong after merging:
```bash
git revert -m 1 <merge-commit>      # or: git checkout legacy-site-backup -- docs && git commit
git push
```
The `v1-legacy` tag always points to the exact old site.

## The special site
`site/special/` is copied to `docs/special/` with everything else, and will be live at `https://jordanj7.github.io/JJ-Portfolio-/special/`. It currently holds **placeholder pictures and quotes**, built with your three real answers, so it works as soon as the site is live. Add your real photos, videos, quotes and folder contents afterward (see README, "The special site"): put them in `private-src/` (never committed), run `tools/build-private.mjs` with your answers in the environment, then commit only the encrypted output in `docs/special/`.

## Before you announce it
- [ ] Email on the Contact section is the one you want public
- [ ] "Starting the AI Engineering master's in January" in About is OK to share
- [ ] Project dates are right (Generative Art and Solar System are set to Fall 2024)
- [ ] FLX Edits: you are comfortable with the short film-footage previews (or remove the two clips)
- [ ] Sony storyboard images and Journal-101 screenshots added (or those pages are fine as they are)
- [ ] Update the links on LinkedIn and your resume (the resume header has a "Portfolio" link)

## Optional later
- **Shorter address**: rename the repo to `jordanj7.github.io` to serve from the root (https://jordanj7.github.io/). Old project-page URLs would change, so do this only after the new site is stable.
- **Custom domain**: add a `CNAME` file in `docs/` and set the domain under Settings > Pages.
