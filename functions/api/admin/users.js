import { hashPassword } from '../auth/login.js';

export async function onRequestGet(context) {
  const { env } = context;

  const users = await env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.display_name, u.role_id, u.is_admin, u.is_active,
            u.created_at, u.last_login, u.google_sub,
            r.name as role_name
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY u.id`
  ).all();

  return new Response(JSON.stringify(users.results || []), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { username, email, password, display_name, role_id, is_admin } = body;

  if (!username || !email || !password || !display_name) {
    return new Response(JSON.stringify({ error: 'username, email, password, and display_name are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check uniqueness
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  ).bind(username, email).first();

  if (existing) {
    return new Response(JSON.stringify({ error: 'Username or email already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const passwordHash = await hashPassword(password);

  const result = await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, display_name, role_id, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(username, email, passwordHash, display_name, role_id || null, is_admin ? 1 : 0).run();

  return new Response(JSON.stringify({ id: result.meta.last_row_id, username, email, display_name }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
