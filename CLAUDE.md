# IdeaBox: guide for contributors and AI coding assistants

IdeaBox is a browser-based AI CAD generator for laser-cut designs, by Mike Warren
([dinosaurmike](https://github.com/dinosaurmike)): a description (or a photo) becomes a
parametric box, tray, shelf or table with joinery, shown in 3D, laid out on a laser bed and
exported as 1:1 SVG cut files. Live at <https://dinomike.ca/ideabox>. All rights reserved
(see `LICENSE`).

## What this repository contains

* **The built app only.** `index.html` loads `assets/index-<hash>.js` (one bundle: React, three.js,
  the parametric geometry engine and the AI integration) and `assets/index-<hash>.css` (Tailwind).
  The original source (Vite + React project) is not in this repository yet; when it is added,
  update this file and the README's "How it's built" section.
* `hero-animated.html`: a self-contained showcase (Prompt → CAD → Physical) with four embedded
  studio renders and a canvas wireframe. It loads Tailwind from
  `https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js` and fonts from Google Fonts.
* `docs/images/`: `ideabox-header.gif` (README), `ideabox-social.png` (GitHub social preview,
  1280 × 640) and their sources in `docs/images/source/` (`record-hero.js` records the hero with
  Playwright and cuts one seamless 12.7 s loop with ffmpeg; `social-preview.html` is the still).

## Ground rules

* **No secrets in the repository.** Each user brings their own AI provider credential; the app
  stores it in the browser's `localStorage` (entries named with the `ideabox_` prefix, along with
  a few settings) and sends it only to the provider they chose. Don't rename those `ideabox_`
  entries: users would lose what they saved.
* **Never build with a key in the environment.** Vite copies `VITE_*` variables into the public
  JavaScript bundle as plain text. An earlier build had a default Gemini key baked in this way
  (removed from the bundle here, and the key revoked). A shared "works without a key" default
  must live behind a small serverless function (e.g. a Netlify function holding the key in its
  environment), never in the app.
* **The shared AI service:** when a visitor has no Gemini key, the app's Gemini "key" is the marker
  `ideabox-shared`, and both Gemini calls (design from text, in function `N5`; photo to design)
  go to `/.netlify/functions/ideabox-ai?model=…` instead of Google. These were patched directly
  into the built bundle (no source in this repo). The function (`netlify/functions/ideabox-ai.js`)
  reads `IDEABOX_GEMINI_KEY` from Netlify's environment, accepts only POSTs from
  https://dinomike.ca, only the three Gemini models IdeaBox uses, bodies up to 5 MB, and 30
  requests per visitor IP per hour (in memory, best effort); Google's 429 becomes a friendly
  "busy, try later or add your own key" message. Use a key from its own Google project with no
  billing, so a drained quota can't affect anything else.
* AI providers and models used by the build: Gemini (`gemini-3.6-flash`, also listing models via
  the API), OpenAI chat completions (`gpt-4o-mini`), Anthropic messages (Claude Sonnet). There is
  also an offline fallback that needs no key.
* Paths are relative (`./assets/…`), so the app runs from any sub-folder of a static host.
