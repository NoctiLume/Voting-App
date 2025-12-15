// Cloudflare Pages Function - handles all API routes
// This file should be placed in: /functions/api/[[path]].js
// Cloudflare Pages will automatically route /api/* requests here

import { parseCookies, setCookie, isAdmin, initDatabase } from '../utils.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = params.path || '';
  const url = new URL(request.url);
  
  // Initialize database
  await initDatabase(env.DB);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  try {
    let response;
    
    // Route handlers
    if (path === 'login' && request.method === 'POST') {
      response = await handleLogin(request, env);
    } else if (path === 'logout' && request.method === 'GET') {
      response = await handleLogout();
    } else if (path === 'saveCandidate' && request.method === 'POST') {
      response = await handleSaveCandidate(request, env);
    } else if (path === 'getCandidate' && request.method === 'GET') {
      response = await handleGetCandidate(request, url, env);
    } else if (path === 'uploadPhoto' && request.method === 'POST') {
      response = await handleUploadPhoto(request, env);
    } else if (path === 'deleteCandidate' && request.method === 'POST') {
      response = await handleDeleteCandidate(request, env);
    } else if (path === 'submitVote' && request.method === 'POST') {
      response = await handleSubmitVote(request, env);
    } else if (path === 'getVotes' && request.method === 'GET') {
      response = await handleGetVotes(env);
    } else if (path === 'resetVotes' && request.method === 'POST') {
      response = await handleResetVotes(request, env);
    } else {
      response = new Response('Not Found', { status: 404 });
    }
    
    // Add CORS headers
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

// All handler functions (same as in index-d1.js)
async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const formData = await request.formData();
  const password = formData.get('password') || '';
  
  const storedHash = env.ADMIN_PASSWORD_HASH || "$2b$10$/V9PVyVowqw9WlNjoLQXhOGH..bez.8QRSnSBmHgRHol3IAKOhUl.";
  
  // Simple password check
  if (password !== env.ADMIN_PASSWORD && password.length === 0) {
    return new Response('SALAAAAH', { status: 401 });
  }
  
  const headers = new Headers({
    'Set-Cookie': setCookie('admin', 'true'),
    'Content-Type': 'text/plain'
  });
  
  return new Response('ok', { status: 200, headers });
}

async function handleLogout() {
  const headers = new Headers({
    'Set-Cookie': setCookie('admin', '', { maxAge: 0 }),
    'Location': '/admin/admin.html'
  });
  
  return new Response(null, { status: 302, headers });
}

async function handleSaveCandidate(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const data = await request.json();
  const { calonId, nama, visiMisi, photoPath } = data;
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  await env.DB.prepare(`
    INSERT INTO candidates (calonId, nama, visiMisi, photoPath, updatedAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(calonId) DO UPDATE SET
      nama = excluded.nama,
      visiMisi = excluded.visiMisi,
      photoPath = excluded.photoPath,
      updatedAt = excluded.updatedAt
  `).bind(calonId, nama, visiMisi, photoPath, Date.now()).run();
  
  return new Response('Saved', { status: 200 });
}

async function handleGetCandidate(request, url, env) {
  const calonId = url.searchParams.get('id');
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  const result = await env.DB.prepare(`
    SELECT nama, visiMisi, photoPath FROM candidates WHERE calonId = ?
  `).bind(calonId).first();
  
  return new Response(JSON.stringify(result || {}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

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
  
  const photoPath = `candidates/${calonId}.jpg`;
  const fileBuffer = await file.arrayBuffer();
  
  try {
    await env.R2_BUCKET.put(photoPath, fileBuffer, {
      httpMetadata: {
        contentType: file.type || 'image/jpeg'
      }
    });
    
    return new Response(photoPath, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return new Response('Upload failed', { status: 500 });
  }
}

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
  
  await env.DB.prepare('DELETE FROM candidates WHERE calonId = ?')
    .bind(calonId).run();
  
  try {
    const photoPath = `candidates/${calonId}.jpg`;
    await env.R2_BUCKET.delete(photoPath);
  } catch (e) {
    // Ignore storage delete errors
  }
  
  return new Response('Deleted', { status: 200 });
}

async function handleSubmitVote(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const { calonId } = await request.json();
  
  if (!calonId || !['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  try {
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

async function handleGetVotes(env) {
  const result = await env.DB.prepare(`
    SELECT calonId, count FROM votes
  `).all();
  
  const votes = {
    calon1: 0,
    calon2: 0,
    calon3: 0,
    calon4: 0
  };
  
  if (result.results) {
    result.results.forEach(row => {
      if (votes.hasOwnProperty(row.calonId)) {
        votes[row.calonId] = row.count || 0;
      }
    });
  }
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  
  return new Response(JSON.stringify(votes), { status: 200, headers });
}

async function handleResetVotes(request, env) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  await env.DB.prepare('DELETE FROM votes').run();
  
  return new Response('Votes reset', { status: 200 });
}

