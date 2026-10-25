// Deployment configuration. Everything here is optional.
//
// imageService: an HTTPS endpoint YOU host that re-renders the companion's
// photo with new appearance settings while keeping the same face. The page
// sends { characterId, referenceImage, appearance, outfit, keepIdentity }
// and expects { image: "<https or data: URL>" }. Keep provider API keys on
// that server, never in this page. Note: a published Claude artifact can
// only call its own origin, so this works when you self-host the app.
//
// Set it by defining window.COMPANION_CONFIG before the app loads, e.g.
//   <script>window.COMPANION_CONFIG = { imageService: { endpoint: '/api/render-look' } }</script>
export const CONFIG = {
  imageService: (typeof window !== 'undefined' && window.COMPANION_CONFIG?.imageService) || null,
};
