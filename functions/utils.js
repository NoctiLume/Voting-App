// Utility functions for Cloudflare Pages Functions

// Helper function to parse cookies
export function parseCookies(request) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return {};
  
  const cookies = {};
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0]] = parts[1];
    }
  });
  return cookies;
}

// Helper function to set cookie
export function setCookie(name, value, options = {}) {
  const defaults = {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
    ...options
  };
  
  const parts = [`${name}=${value}`];
  if (defaults.httpOnly) parts.push('HttpOnly');
  if (defaults.secure) parts.push('Secure');
  parts.push(`SameSite=${defaults.sameSite}`);
  parts.push(`Path=${defaults.path}`);
  if (defaults.maxAge) parts.push(`Max-Age=${defaults.maxAge}`);
  
  return parts.join('; ');
}

// Helper to check admin authentication
export function isAdmin(request) {
  const cookies = parseCookies(request);
  return cookies.admin === 'true';
}

// Initialize database schema
export async function initDatabase(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      calonId TEXT PRIMARY KEY,
      nama TEXT,
      visiMisi TEXT,
      photoPath TEXT,
      updatedAt INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS votes (
      calonId TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0
    );
  `);
}

