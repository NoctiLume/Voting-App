// API Configuration
// Your Cloudflare Worker URL
window.API_BASE_URL = 'https://voting-app-api.shigoto.workers.dev';

// Helper function to make API calls
window.apiFetch = async function(path, options = {}) {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const url = `${window.API_BASE_URL}/${cleanPath}`;
  return fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for auth
  });
};
