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
* AI providers and models used by the build: Gemini (`gemini-3.6-flash`, also listing models via
  the API), OpenAI chat completions (`gpt-4o-mini`), Anthropic messages (Claude Sonnet). There is
  also an offline fallback that needs no key.
* Paths are relative (`./assets/…`), so the app runs from any sub-folder of a static host.
