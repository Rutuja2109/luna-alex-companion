// Appearance re-rendering (integration point). Disabled unless an image
// service is configured in src/config.js. Without it, hair / skin / eye
// choices are saved as preferences only, and the UI says so.
import { CONFIG } from '../config.js';

export const isConfigured = () => !!CONFIG.imageService?.endpoint;

export async function renderLook({ characterId, referenceImage, appearance, outfit, signal, timeoutMs = 60000 }) {
  if (!isConfigured()) { const e = new Error('No image service is configured'); e.code = 'not_configured'; throw e; }
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  signal?.addEventListener('abort', () => ctl.abort(), { once: true });
  try {
    const res = await fetch(CONFIG.imageService.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ characterId, referenceImage, appearance, outfit, keepIdentity: true }),
    });
    if (!res.ok) { const e = new Error(`Image service error (${res.status})`); e.code = 'http'; throw e; }
    const j = await res.json();
    if (typeof j?.image !== 'string' || !/^(https:|data:image\/|\/|assets\/)/.test(j.image)) { const e = new Error('Image service returned no image'); e.code = 'invalid'; throw e; }
    return j.image;
  } finally { clearTimeout(t); }
}
