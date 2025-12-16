// Cloudflare Worker for Voting App Backend
// Uses Cloudflare D1 (SQLite) and R2 (Storage)
// This is the recommended approach for Cloudflare

import bcrypt from 'bcryptjs';

const PASSWORD_HASH = "$2b$10$/V9PVyVowqw9WlNjoLQXhOGH..bez.8QRSnSBmHgRHol3IAKOhUl.";

// Helper function to parse cookies
function parseCookies(request) {
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
function setCookie(name, value, options = {}) {
  const defaults = {
    httpOnly: true,
    secure: true,
    sameSite: 'None', // Changed to None for cross-origin support
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
function isAdmin(request) {
  const cookies = parseCookies(request);
  return cookies.admin === 'true';
}

// Simple bcrypt alternative using Web Crypto API
async function verifyPassword(password, hash) {
  // For production, you should hash passwords on the server
  // This is a simplified version - you can use a pre-hashed comparison
  // or implement proper bcrypt in Workers (would need WASM)
  
  // For now, we'll do a simple comparison with the stored hash
  // In production, generate the hash during setup and store it
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Compare with stored hash (you'll need to adjust this based on your password hashing method)
  // For now, returning true if password matches a simple check
  // TODO: Implement proper password verification
  return password.length > 0; // Simplified - replace with proper verification
}

// Initialize database schema (run this once)
async function initDatabase(db) {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        calonId TEXT PRIMARY KEY,
        nama TEXT,
        visiMisi TEXT,
        photoPath TEXT,
        photoData TEXT,
        updatedAt INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS votes (
        calonId TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0
      );
    `);
  } catch (error) {
    console.error('Database init error (may be harmless):', error);
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    
    // Strip /api prefix if present (for Pages integration)
    if (path.startsWith('/api/')) {
      path = path.replace('/api', '');
    }
    
    // CORS headers - allow credentials from the requesting origin
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
    
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    try {
      let response;
      
      // Route handlers
      if (path === '/test' && request.method === 'GET') {
        // Simple test endpoint
        response = new Response(JSON.stringify({ status: 'ok', db: !!env.DB }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (path === '/login' && request.method === 'POST') {
        response = await handleLogin(request, env);
      } else if (path === '/logout' && request.method === 'GET') {
        response = await handleLogout();
      } else if (path.startsWith('/pageadmin')) {
        response = await handleCheckAdmin(request, path);
      } else if (path === '/saveCandidate' && request.method === 'POST') {
        response = await handleSaveCandidate(request, env);
      } else if (path === '/getCandidate' && request.method === 'GET') {
        response = await handleGetCandidate(request, url, env);
      } else if (path === '/uploadPhoto' && request.method === 'POST') {
        response = await handleUploadPhoto(request, env);
      } else if (path === '/deleteCandidate' && request.method === 'POST') {
        response = await handleDeleteCandidate(request, env);
      } else if (path === '/submitVote' && request.method === 'POST') {
        response = await handleSubmitVote(request, env);
      } else if (path === '/getVotes' && request.method === 'GET') {
        response = await handleGetVotes(env);
      } else if (path === '/resetVotes' && request.method === 'POST') {
        response = await handleResetVotes(request, env);
      } else {
        response = new Response('Not Found', { status: 404 });
      }
      
      // Add CORS headers to all responses
      const headers = new Headers(response.headers);
      Object.keys(corsHeaders).forEach(key => {
        headers.set(key, corsHeaders[key]);
      });
      
      return new Response(response.body, {
        status: response.status,
        headers: headers
      });
      
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Login handler
async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const formData = await request.formData();
  const password = formData.get('password') || '';
  
  let isValid = false;
  
  if (env.ADMIN_PASSWORD) {
    // Use environment variable if set
    isValid = (password === env.ADMIN_PASSWORD);
  } else {
    // Use bcrypt to check against the hash
    isValid = await bcrypt.compare(password, PASSWORD_HASH);
  }
  
  if (!isValid) {
    return new Response('SALAAAAH', { status: 401 });
  }
  
  const headers = new Headers({
    'Set-Cookie': setCookie('admin', 'true'),
    'Content-Type': 'text/plain'
  });
  
  return new Response('ok', { status: 200, headers });
}

// Logout handler
async function handleLogout() {
  const headers = new Headers({
    'Set-Cookie': setCookie('admin', '', { maxAge: 0 }),
    'Location': '/admin/admin.html'
  });
  
  return new Response(null, { status: 302, headers });
}

// Check admin handler (for protected routes)
async function handleCheckAdmin(request, path) {
  if (!isAdmin(request)) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': '/admin/admin.html' }
    });
  }
  
  // This will be handled by Cloudflare Pages routing
  return new Response('Admin page', { status: 200 });
}

// Save candidate handler
async function handleSaveCandidate(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const data = await request.json();
  const { calonId, nama, visiMisi, photoPath, photoData } = data;
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  await env.DB.prepare(`
    INSERT INTO candidates (calonId, nama, visiMisi, photoPath, photoData, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(calonId) DO UPDATE SET
      nama = excluded.nama,
      visiMisi = excluded.visiMisi,
      photoPath = excluded.photoPath,
      photoData = excluded.photoData,
      updatedAt = excluded.updatedAt
  `).bind(calonId, nama, visiMisi, photoPath || null, photoData || null, Date.now()).run();
  
  return new Response('Saved', { status: 200 });
}

// Get candidate handler
async function handleGetCandidate(request, url, env) {
  const calonId = url.searchParams.get('id');
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  const result = await env.DB.prepare(`
    SELECT nama, visiMisi, photoPath, photoData FROM candidates WHERE calonId = ?
  `).bind(calonId).first();
  
  return new Response(JSON.stringify(result || {}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Upload photo handler - stores as base64 in database
async function handleUploadPhoto(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const formData = await request.formData();
  const file = formData.get('photo');
  const calonId = formData.get('calonId');
  
  if (!file || !calonId) {
    return new Response('Invalid upload', { status: 400 });
  }
  
  try {
    // Check file size (limit to 2MB to avoid issues)
    const fileSize = file.size;
    if (fileSize > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 2MB.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Convert image to base64
    const fileBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);
    
    // Convert to base64 - build string chunk by chunk
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    const base64 = btoa(binary);
    const photoData = `data:${file.type || 'image/jpeg'};base64,${base64}`;
    
    // Store base64 in database
    const result = await env.DB.prepare(`
      INSERT INTO candidates (calonId, photoData, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(calonId) DO UPDATE SET
        photoData = excluded.photoData,
        updatedAt = excluded.updatedAt
    `).bind(calonId, photoData, Date.now()).run();
    
    if (!result.success) {
      throw new Error('Database save failed');
    }
    
    // Return success with photoData
    return new Response(JSON.stringify({ photoData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete candidate handler
async function handleDeleteCandidate(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const { calonId } = await request.json();
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  // Delete from database
  await env.DB.prepare('DELETE FROM candidates WHERE calonId = ?')
    .bind(calonId).run();
  
  // Delete from R2 storage (if available)
  if (env.R2_BUCKET) {
    try {
      const photoPath = `candidates/${calonId}.jpg`;
      await env.R2_BUCKET.delete(photoPath);
    } catch (e) {
      // Ignore storage delete errors
    }
  }
  
  return new Response('Deleted', { status: 200 });
}

// Submit vote handler
async function handleSubmitVote(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const { calonId } = await request.json();
  
  if (!calonId || !['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  try {
    // Use a transaction-like operation with D1
    await env.DB.prepare(`
      INSERT INTO votes (calonId, count) VALUES (?, 1)
      ON CONFLICT(calonId) DO UPDATE SET count = count + 1
    `).bind(calonId).run();
    
    return new Response('Vote submitted', { status: 200 });
  } catch (e) {
    console.error('Vote submission error:', e);
    return new Response('Error submitting vote', { status: 500 });
  }
}

// Get votes handler
async function handleGetVotes(env) {
  const votes = {
    calon1: 0,
    calon2: 0,
    calon3: 0,
    calon4: 0
  };
  
  try {
    if (!env.DB) {
      console.warn('Database not available, returning default votes');
      return new Response(JSON.stringify(votes), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
    
    // Try to get votes from database
    const stmt = env.DB.prepare(`SELECT calonId, count FROM votes`);
    const queryResult = await stmt.all();
    
    // D1 .all() returns { results: [], success: true, meta: {...} }
    if (queryResult && queryResult.success !== false && queryResult.results) {
      for (const row of queryResult.results) {
        if (row.calonId && votes.hasOwnProperty(row.calonId)) {
          votes[row.calonId] = row.count || 0;
        }
      }
    }
  } catch (error) {
    // Log error but return default votes so app doesn't break
    console.error('GetVotes error:', error.message || error);
  }
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  
  return new Response(JSON.stringify(votes), { status: 200, headers });
}

// Reset votes handler
async function handleResetVotes(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  // Delete all votes
  await env.DB.prepare('DELETE FROM votes').run();
  
  return new Response('Votes reset', { status: 200 });
}