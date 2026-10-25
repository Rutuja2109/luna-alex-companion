// Minimal AI proxy for the Luna & Alex app (Cloudflare Workers).
// Keeps your Claude API key on the server. Deploy:
//   npm i -g wrangler
//   wrangler secret put ANTHROPIC_API_KEY
//   wrangler deploy server/worker.js --name luna-alex-ai
// Then set window.COMPANION_CONFIG = { aiService: { endpoint: 'https://luna-alex-ai.<you>.workers.dev' } }
// in docs/app/config.js (see README → Phone / Expo).
const MODELS = { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5' };

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors });
    let body;
    try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
    const prompt = String(body.prompt || '').slice(0, 60000);
    if (!prompt) return new Response('Missing prompt', { status: 400, headers: cors });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || MODELS[body.tier] || MODELS.default, max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });
    if (r.status === 429) return new Response('Rate limited', { status: 429, headers: cors });
    if (!r.ok) return new Response(`Upstream ${r.status}`, { status: 502, headers: cors });
    const j = await r.json();
    const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    return new Response(JSON.stringify({ text }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
