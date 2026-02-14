import { hashPassword } from '../../auth/login.js';

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const userId = parseInt(params.id);

  if (isNaN(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates = [];
  const values = [];

  if (body.display_name !== undefined) {
    updates.push('display_name = ?');
    values.push(body.display_name);
  }
  if (body.email !== undefined) {
    updates.push('email = ?');
    values.push(body.email);
  }
  if (body.role_id !== undefined) {
    updates.push('role_id = ?');
    values.push(body.role_id);
  }
  if (body.is_admin !== undefined) {
    updates.push('is_admin = ?');
    values.push(body.is_admin ? 1 : 0);
  }
  if (body.is_active !== undefined) {
    updates.push('is_active = ?');
    values.push(body.is_active ? 1 : 0);
  }
  if (body.password) {
    const hash = await hashPassword(body.password);
    updates.push('password_hash = ?');
    values.push(hash);
  }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  values.push(userId);
  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const user = await env.DB.prepare(
    'SELECT id, username, email, display_name, role_id, is_admin, is_active FROM users WHERE id = ?'
  ).bind(userId).first();

  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const userId = parseInt(params.id);

  if (isNaN(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Soft delete
  await env.DB.prepare('UPDATE users SET is_active = 0 WHERE id = ?').bind(userId).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
