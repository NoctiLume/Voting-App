// Cloudflare Worker for Voting App Backend
// This replaces Firebase Cloud Functions

import bcrypt from 'bcryptjs';

// Firebase configuration - you'll need to add these as environment variables
// Or we can migrate to Cloudflare D1 + R2 (see alternative version)

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
function isAdmin(request) {
  const cookies = parseCookies(request);
  return cookies.admin === 'true';
}

// Helper to get Firestore document (using REST API)
async function getFirestoreDoc(collection, docId) {
  const projectId = FIREBASE_PROJECT_ID; // From env vars
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Firestore error: ${response.statusText}`);
  }
  
  const data = await response.json();
  // Convert Firestore format to our format
  const result = {};
  if (data.fields) {
    Object.keys(data.fields).forEach(key => {
      const field = data.fields[key];
      // Handle different Firestore value types
      if (field.stringValue !== undefined) result[key] = field.stringValue;
      else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue);
      else if (field.doubleValue !== undefined) result[key] = parseFloat(field.doubleValue);
    });
  }
  return result;
}

// Helper to set Firestore document
async function setFirestoreDoc(collection, docId, data) {
  const projectId = FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  
  // Convert our format to Firestore format
  const firestoreData = {
    fields: {}
  };
  
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      firestoreData.fields[key] = { stringValue: data[key] };
    } else if (typeof data[key] === 'number') {
      firestoreData.fields[key] = { integerValue: data[key].toString() };
    } else if (data[key] === null) {
      firestoreData.fields[key] = { nullValue: null };
    }
  });
  
  // Add timestamp
  firestoreData.fields.updatedAt = { timestampValue: new Date().toISOString() };
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(firestoreData)
  });
  
  if (!response.ok) {
    throw new Error(`Firestore error: ${response.statusText}`);
  }
  
  return await response.json();
}

// Helper to delete Firestore document
async function deleteFirestoreDoc(collection, docId) {
  const projectId = FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`
    }
  });
  
  return response.ok;
}

// Helper to get Firebase access token (using service account)
async function getFirebaseAccessToken() {
  // For Cloudflare Workers, we'll use a service account JWT
  // This requires the FIREBASE_SERVICE_ACCOUNT_KEY env var
  // Alternative: Use a pre-generated token stored in KV or environment variable
  return FIREBASE_ACCESS_TOKEN || await generateAccessToken();
}

async function generateAccessToken() {
  // This would generate a JWT from service account
  // For now, we'll use a stored token or implement JWT generation
  // TODO: Implement JWT generation from service account
  throw new Error('Firebase access token not configured');
}

// Helper to run Firestore transaction
async function runFirestoreTransaction(callback) {
  // Firestore transactions require multiple API calls
  // Simplified version for voting
  const projectId = FIREBASE_PROJECT_ID;
  const database = '(default)';
  
  // Start transaction
  const beginUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${database}/documents:beginTransaction`;
  const beginResponse = await fetch(beginUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ options: { readWrite: {} } })
  });
  
  const beginData = await beginResponse.json();
  const transaction = beginData.transaction;
  
  // Execute callback logic (simplified - would need proper transaction handling)
  try {
    const result = await callback(transaction);
    // Commit transaction
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${database}/documents:commit`;
    await fetch(commitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getFirebaseAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transaction, writes: [] })
    });
    return result;
  } catch (e) {
    // Rollback transaction
    throw e;
  }
}

// Get all documents from a collection
async function getAllFirestoreDocs(collection) {
  const projectId = FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Firestore error: ${response.statusText}`);
  }
  
  const data = await response.json();
  const results = {};
  
  if (data.documents) {
    data.documents.forEach(doc => {
      const docId = doc.name.split('/').pop();
      const fields = {};
      if (doc.fields) {
        Object.keys(doc.fields).forEach(key => {
          const field = doc.fields[key];
          if (field.integerValue !== undefined) {
            fields[key] = parseInt(field.integerValue);
          } else if (field.stringValue !== undefined) {
            fields[key] = field.stringValue;
          }
        });
      }
      results[docId] = fields;
    });
  }
  
  return results;
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
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
    
    // Set environment variables (from Cloudflare Workers env)
    globalThis.FIREBASE_PROJECT_ID = env.FIREBASE_PROJECT_ID;
    globalThis.FIREBASE_ACCESS_TOKEN = env.FIREBASE_ACCESS_TOKEN;
    globalThis.FIREBASE_SERVICE_ACCOUNT_KEY = env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    try {
      let response;
      
      // Route handlers
      if (path === '/login' && request.method === 'POST') {
        response = await handleLogin(request);
      } else if (path === '/logout' && request.method === 'GET') {
        response = await handleLogout();
      } else if (path.startsWith('/pageadmin')) {
        response = await handleCheckAdmin(request, path);
      } else if (path === '/saveCandidate' && request.method === 'POST') {
        response = await handleSaveCandidate(request);
      } else if (path === '/getCandidate' && request.method === 'GET') {
        response = await handleGetCandidate(request, url);
      } else if (path === '/uploadPhoto' && request.method === 'POST') {
        response = await handleUploadPhoto(request, env);
      } else if (path === '/deleteCandidate' && request.method === 'POST') {
        response = await handleDeleteCandidate(request);
      } else if (path === '/submitVote' && request.method === 'POST') {
        response = await handleSubmitVote(request);
      } else if (path === '/getVotes' && request.method === 'GET') {
        response = await handleGetVotes();
      } else if (path === '/resetVotes' && request.method === 'POST') {
        response = await handleResetVotes(request);
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
async function handleLogin(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const formData = await request.formData();
  const password = formData.get('password') || '';
  
  // Note: bcryptjs might not work in Workers, we may need to use Web Crypto API
  // For now, we'll use a simple comparison (you should hash on client or use a different approach)
  const ok = await bcrypt.compare(password, PASSWORD_HASH);
  
  if (!ok) {
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
  
  // For protected admin pages, we'd serve the HTML
  // In Cloudflare Pages, this would be handled by Pages Functions
  // For now, return a redirect or handle via Pages routing
  const filePath = path.replace('/pageadmin', '') || '/pageadmin.html';
  // This should be handled by Cloudflare Pages routing
  return new Response('Admin page', { status: 200 });
}

// Save candidate handler
async function handleSaveCandidate(request) {
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
  
  await setFirestoreDoc('candidates', calonId, {
    nama,
    visiMisi,
    photoPath
  });
  
  return new Response('Saved', { status: 200 });
}

// Get candidate handler
async function handleGetCandidate(request, url) {
  const calonId = url.searchParams.get('id');
  
  if (!['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  const data = await getFirestoreDoc('candidates', calonId);
  
  return new Response(JSON.stringify(data || {}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Upload photo handler
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
  
  // Upload to Firebase Storage or Cloudflare R2
  // For now, we'll use Firebase Storage REST API
  const photoPath = `candidates/${calonId}.jpg`;
  
  // Upload to Firebase Storage
  const projectId = FIREBASE_PROJECT_ID;
  const bucketName = `${projectId}.appspot.com`;
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${photoPath}`;
  
  const fileBuffer = await file.arrayBuffer();
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getFirebaseAccessToken()}`,
      'Content-Type': file.type || 'image/jpeg'
    },
    body: fileBuffer
  });
  
  if (!uploadResponse.ok) {
    throw new Error('Upload failed');
  }
  
  return new Response(photoPath, { status: 200 });
}

// Delete candidate handler
async function handleDeleteCandidate(request) {
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
  
  // Delete from Firestore
  await deleteFirestoreDoc('candidates', calonId);
  
  // Delete from Storage (simplified - would need proper error handling)
  try {
    const projectId = FIREBASE_PROJECT_ID;
    const bucketName = `${projectId}.appspot.com`;
    const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/candidates%2F${calonId}.jpg`;
    
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${await getFirebaseAccessToken()}`
      }
    });
  } catch (e) {
    // Ignore storage delete errors
  }
  
  return new Response('Deleted', { status: 200 });
}

// Submit vote handler
async function handleSubmitVote(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  const { calonId } = await request.json();
  
  if (!calonId || !['calon1', 'calon2', 'calon3', 'calon4'].includes(calonId)) {
    return new Response('Invalid calon', { status: 400 });
  }
  
  try {
    // Get current vote count
    const voteData = await getFirestoreDoc('votes', calonId);
    const currentCount = voteData?.count || 0;
    
    // Update vote count (simplified - for production, use transactions)
    await setFirestoreDoc('votes', calonId, {
      count: currentCount + 1
    });
    
    return new Response('Vote submitted', { status: 200 });
  } catch (e) {
    console.error('Transaction failure:', e);
    return new Response('Error submitting vote', { status: 500 });
  }
}

// Get votes handler
async function handleGetVotes() {
  const votesData = await getAllFirestoreDocs('votes');
  
  const votes = {
    calon1: votesData.calon1?.count || 0,
    calon2: votesData.calon2?.count || 0,
    calon3: votesData.calon3?.count || 0,
    calon4: votesData.calon4?.count || 0
  };
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  
  return new Response(JSON.stringify(votes), { status: 200, headers });
}

// Reset votes handler
async function handleResetVotes(request) {
  if (!isAdmin(request)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  
  // Delete all vote documents
  const votesData = await getAllFirestoreDocs('votes');
  for (const calonId of Object.keys(votesData)) {
    await deleteFirestoreDoc('votes', calonId);
  }
  
  return new Response('Votes reset', { status: 200 });
}

