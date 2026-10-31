// IdeaBox's shared AI service: lets visitors design without their own key.
//
// The app sends its Gemini request here (instead of straight to Google) when the visitor hasn't
// added a key. This function adds the key, which lives only in Netlify's environment variables
// (Site configuration → Environment variables → IDEABOX_GEMINI_KEY), forwards the request to
// Gemini and returns the answer. The key is never sent to the browser.
//
// Guards: only requests from your own site, only the Gemini models IdeaBox uses, a size limit,
// and a per-visitor rate limit. The rate limit is kept in memory, so it's best-effort (each warm
// copy of the function counts separately); Gemini's own free-tier quota is the hard ceiling.

const ALLOWED_ORIGINS = ['https://dinomike.ca', 'https://www.dinomike.ca'];
const ALLOWED_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
const MAX_BODY_BYTES = 5 * 1024 * 1024;   // photos are sent as base64 text
const LIMIT = 30;                         // requests per visitor…
const WINDOW_MS = 60 * 60 * 1000;         // …per hour

const recent = new Map();  // visitor IP → times of recent requests

function tooMany(ip) {
  const now = Date.now();
  const times = (recent.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (times.length >= LIMIT) {
    recent.set(ip, times);
    return true;
  }
  times.push(now);
  recent.set(ip, times);
  if (recent.size > 5000) recent.clear();  // keep memory bounded
  return false;
}

function reply(status, message, origin) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {})
    },
    body: JSON.stringify({ error: { message } })
  };
}

exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: allowed ? 204 : 403,
      headers: allowed ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin'
      } : {}
    };
  }
  if (event.httpMethod !== 'POST') return reply(405, 'Use POST.');
  if (!allowed) return reply(403, 'IdeaBox\'s shared AI only works on dinomike.ca. Add your own key in AI Settings.');

  const key = process.env.IDEABOX_GEMINI_KEY;
  if (!key) return reply(500, 'The shared AI isn\'t set up (missing IDEABOX_GEMINI_KEY).', origin);

  const model = (event.queryStringParameters || {}).model || 'gemini-3.6-flash';
  if (!ALLOWED_MODELS.includes(model)) return reply(400, 'That model isn\'t available here.', origin);

  const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (!body || Buffer.byteLength(body) > MAX_BODY_BYTES) return reply(413, 'That request is too large.', origin);

  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (tooMany(ip)) {
    return reply(429, 'You\'ve reached the free limit for now (30 designs an hour). Try again later, or add your own free Gemini key in AI Settings.', origin);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body
    });
    const text = await res.text();
    if (res.status === 429) {
      return reply(429, 'IdeaBox\'s free AI is busy (today\'s shared allowance is used up). Try again later, or add your own free Gemini key in AI Settings.', origin);
    }
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, Vary: 'Origin' },
      body: text
    };
  } catch (e) {
    return reply(502, 'Couldn\'t reach the AI service. Please try again.', origin);
  }
};
