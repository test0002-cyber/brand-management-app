// Runtime environment overrides for the frontend.
// This file is loaded at page load (before the app bundle) and allows
// changing API endpoints without rebuilding the app.
// Deployers can modify this file on the static host (Cloudflare Pages)
// to point the app to the correct backend URL.

window._env_ = window._env_ || {};

// Default to the deployed Worker URL. Change this value in production
// by editing `public/env.js` on the Pages deployment if needed.
window._env_.REACT_APP_API_URL = window._env_.REACT_APP_API_URL || 'https://brand-management-api.testgithub0002.workers.dev';
