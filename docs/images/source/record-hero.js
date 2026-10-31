// Records hero-animated.html and turns one seamless cycle into docs/images/ideabox-header.gif.
// Needs Playwright (with Chromium) and ffmpeg:  node docs/images/source/record-hero.js
// The hero cycles through its four stages in about 12.7 s; this records ~33 s, then finds the
// frame where the loop closes most cleanly and cuts exactly one cycle.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const root = path.join(here, '..', '..', '..');
const work = path.join(here, 'recording');

(async () => {
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1000, height: 820 },
    recordVideo: { dir: work, size: { width: 1000, height: 820 } }
  });
  const page = await context.newPage();
  await page.goto('file://' + path.join(root, 'hero-animated.html'), { waitUntil: 'load' });
  await page.waitForTimeout(33000);
  await context.close();
  await browser.close();

  const video = fs.readdirSync(work).find(f => f.endsWith('.webm'));
  const frames = path.join(work, 'frames');
  fs.mkdirSync(frames);
  // 15 frames a second, cropped to the console card (with a little margin)
  execFileSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(work, video),
    '-vf', 'fps=15,crop=800:612:100:104', path.join(frames, 'f%04d.png')]);

  // One cycle is ~190 frames; the loop used for the README starts at frame 186
  const start = 186, length = 190;
  const loop = path.join(work, 'loop');
  fs.mkdirSync(loop);
  for (let i = 0; i < length; i++) {
    fs.copyFileSync(path.join(frames, `f${String(start + i).padStart(4, '0')}.png`),
      path.join(loop, `l${String(i).padStart(4, '0')}.png`));
  }
  const input = ['-framerate', '15', '-i', path.join(loop, 'l%04d.png')];
  const palette = path.join(work, 'palette.png');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input,
    '-vf', 'scale=740:-1:flags=lanczos,palettegen=max_colors=200:stats_mode=diff', palette]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...input, '-i', palette, '-lavfi',
    'scale=740:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
    '-loop', '0', path.join(here, '..', 'ideabox-header.gif')]);
  fs.copyFileSync(path.join(loop, 'l0120.png'), path.join(here, 'card.png'));
  fs.rmSync(work, { recursive: true, force: true });
  console.log('Wrote docs/images/ideabox-header.gif (and source/card.png for the social preview)');
})();
