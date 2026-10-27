# Reset Therapy

**English** · [繁體中文](README.zh-TW.md)

A visual therapy device for people who live inside AI quota limits.

**Project page:** https://ted-h-com.github.io/reset-therapy/

**Play:** https://ted-h-com.github.io/reset-therapy/play/

**With shared counters:** https://www.ted-h.com/reset-therapy (the same toy, running the optional stats module)

Four painstakingly faked usage panels (ChatGPT / Codex, Claude, Gemini, Grok) sit there burning your quota in real time. The numbers climb. The reset day never comes. Here, you do not wait until Monday: you press the button, the chained golden dragon breaks free, the bars refill, world peace.

![Reset Therapy in a desktop browser, before any reset](docs/screenshot-desktop.png)

## What it does

- Mock settings panels styled after the four providers' usage pages. Until you reset a provider, its numbers keep climbing every 0.9 seconds and stop just short of the limit.
- One reset button per provider (clicking the dragon works too), plus a big "Reset all four". Reset always works here, unlike real life.
- Four golden dragons in chains. Resetting a provider snaps the chains with a clank and confetti, and the freed dragon celebrates in a comic bubble.
- Once all four are reset, "Burned out again..." puts everyone back in chains.
- A Weekly Therapy Leaderboard appears after your first reset. The provider columns are ordered by this week's rank.
- Leaderboard numbers are a deterministic fake baseline, computed from the current date and time, plus real presses: from the optional API when the page can reach it, otherwise from this browser.
- "This week" is the same for every visitor, wherever they are: Monday 00:00 to Sunday 23:59 Taipei time (UTC+8), the same weeks the API counts in.
- Your own heal count is kept in localStorage.
- Bilingual: English and Traditional Chinese (台灣正體), with a language switcher.
- Respects prefers-reduced-motion: no animations, confetti, or screen flash.
- Zero build step, zero dependencies: one self-contained `index.html` (about 558 KB, art baked in as data URIs, fonts from Google Fonts).

## Usage Instructions

Using Reset Therapy is simple and requires no login or real AI accounts.
- **View Quotas:** The main page displays four usage panels. Watch the numbers climb as they simulate quota usage.
- **Reset a Provider:** Click the "Reset" button under a specific provider, or click directly on the chained dragon for that provider.
- **Reset All:** Click the large "Reset all four" button at the bottom of the page to free all dragons simultaneously.
- **View Leaderboard:** After your first reset, a "Weekly Therapy Leaderboard" will appear. It shows the rankings of which providers have been healed the most this week.
- **Language Switch:** Use the language toggle in the top-right corner to switch between English and Traditional Chinese.

## Environment Setup

Running Reset Therapy locally is easy, as the core app has no build step or dependencies.

1. **Frontend (The App):**
   Simply clone the repository and open `index.html` in any web browser.
   ```bash
   git clone https://github.com/ted-h-com/reset-therapy.git
   cd reset-therapy
   # Open index.html in your browser
   ```
2. **Backend (Optional Odoo Stats Module):**
   If you want to run the shared global counters:
   - Ensure you have Odoo 19 set up.
   - Symlink or copy `server/reset_therapy_stats` into your Odoo addons path.
   - Install the module within your Odoo database.
3. **Art Pipeline (Optional):**
   If you wish to regenerate the dragon art, you will need Python 3 and the `Pillow` and `openai` packages.
   ```bash
   pip install Pillow openai
   cd art
   OPENAI_API_KEY=your-api-key python3 gen_dragons.py
   python3 drg_post.py
   ```

## Workflow Architecture

The project is structured around a few loosely coupled components:

- **Frontend (`index.html`):** A single, zero-dependency HTML file containing all logic, styling, and base64-encoded art. It falls back to local storage and deterministic baselines if the backend is unreachable.
- **Backend (`server/`):** An optional Odoo 19 module (`reset_therapy_stats`). It provides two API endpoints (`/reset-therapy/api/stats` and `/reset-therapy/api/heal`) backed by a SQLite database to track global reset counts and enforce rate limiting. The frontend communicates with these endpoints if they are available on the same origin.
- **Art Pipeline (`art/`):** Python scripts use the OpenAI API to generate raw images, which are then processed (cropped, converted to WebP) and injected directly into the `index.html` file.
- **Deployment (`.github/workflows/`):** GitHub Actions automatically deploy the project page (`site/`) and the application itself (`index.html` served at `play/`) to GitHub Pages on every push to the `main` branch.

For a detailed explanation of the client intake workflow, conversation session states, and prompt boundaries, see [Reset Therapy: Flow and State Machine Reference](docs/therapy_flow.md).

## Run it

Play it at <https://ted-h-com.github.io/reset-therapy/play/> (Chinese: <https://ted-h-com.github.io/reset-therapy/play/?lang=zh>).

To run your own copy, open `index.html` in a browser. That is the whole app. Any static host works. Language: `?lang=zh` / `?lang=en`, or the switcher in the top-right corner.

Without a backend the page still fully works: it falls back to the deterministic baseline plus your own local counts. That is what happens on GitHub Pages. The copy on [ted-h.com](https://www.ted-h.com/reset-therapy) runs the stats module below, so its leaderboard counts presses from every visitor.

## Optional backend: shared global counters

So every visitor sees the same "how many times humanity healed Claude this week" numbers, the page calls two endpoints on its own origin, at a fixed path (and degrades gracefully if they are absent):

```
GET  /reset-therapy/api/stats
     -> {"weekIdx": N,
         "week": {"claude": 0, "codex": 0, "gemini": 0, "grok": 0},
         "all":  {"claude": 0, "codex": 0, "gemini": 0, "grok": 0}}

POST /reset-therapy/api/heal
     {"providers": ["claude", "gemini"]}
     -> fresh stats payload (each listed provider +1 this week)
     -> 400 {"error": "..."} when the body is malformed
     -> 429 {"error": "rate limited"} plus Retry-After when over the limit
```

`server/reset_therapy_stats/` is a reference implementation: an Odoo 19 module that stores the counters in a single SQLite file in Odoo's data directory (one row per provider per week, Monday-start weeks at a fixed UTC+8, Asia/Taipei). Both endpoints are public, with no authentication. Any small server in any framework can implement the same contract.

The heal endpoint protects itself:

- **400 for malformed input.** The body must be at most 4 KB of UTF-8 JSON: an object whose `providers` is a list of strings naming at least one known provider. Anything else (broken JSON, the wrong shape, an oversized body) gets 400 with a short message such as `{"error": "bad json"}`. Unknown names are ignored and a provider listed twice counts once, so one request adds at most 1 per provider (4 in total).
- **429 over the rate limit.** Each client gets 30 accepted heal requests in any 60 seconds. Past that, the answer is 429 `{"error": "rate limited"}` with a `Retry-After` header in seconds, and nothing is counted. Refused requests do not count toward the 30. The page simply ignores a refused heal.
- **Who counts as a client.** The `CF-Connecting-IP` header if present, else the first `X-Forwarded-For` entry, else the connection's own address. IPv6 addresses are grouped per /64. These headers are trusted as sent, so only expose the server through Cloudflare or your reverse proxy.
- **Shared by all workers.** The limiter keeps its state in the same SQLite file (a hash of the client address plus a timestamp; rows older than a minute are deleted on the next heal), so the limit holds across Odoo's worker processes.

The stats endpoint has no limit. The module's logic is plain Python in `core.py`, and its unit tests need no Odoo: `python3 -m unittest discover -s server/tests -v` (they also run on every pull request).

## Art pipeline

The dragons are gpt-image-2 output, post-processed to 600x750 WebP and inlined:

```
cd art
OPENAI_API_KEY=sk-... python3 gen_dragons.py   # 4 PNGs (1024x1536) into art/out/
python3 drg_post.py                            # crop, WebP, inject into ../index.html
```

`drg_post.py` needs Pillow. It writes `art/drg_*.webp` and replaces the `__DRG_CODEX__`, `__DRG_CLAUDE__`, `__DRG_GEMINI__`, and `__DRG_GROK__` placeholder tokens in `../index.html`. The shipped `index.html` already has the art baked in and no tokens left, so regenerating needs your own template.

## How GitHub Pages serves it

`.github/workflows/pages.yml` publishes `site/` (the project page) at https://ted-h-com.github.io/reset-therapy/ and copies `index.html` to `play/index.html`, so the toy is at https://ted-h-com.github.io/reset-therapy/play/. It runs when `site/`, `index.html`, or the workflow changes on `main`.

## Files

```
index.html                    the toy, self-contained
site/                         project page (GitHub Pages)
.github/workflows/pages.yml   deploys site/ plus the toy at play/
.github/workflows/tests.yml   runs the unit tests
server/reset_therapy_stats/   optional Odoo 19 stats module (LGPL-3)
server/tests/                 unit tests for the module's core (plain Python)
art/                          dragon art scripts and the four WebP files
docs/                         screenshots
```

## Disclaimer

This is a parody toy. The provider panels imitate the look of real products for the joke; the project is not affiliated with OpenAI, Anthropic, Google, or xAI. The numbers are theatre: the quota panels are animation, and the leaderboard is a deterministic fake baseline plus real button presses. No real accounts are read, and pressing reset here sadly does not reset anything real.

## License

MIT for the page and scripts (see `LICENSE`). The optional Odoo module under `server/` is LGPL-3, per Odoo convention (stated in its manifest).
