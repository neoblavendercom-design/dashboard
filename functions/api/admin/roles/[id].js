export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const roleId = parseInt(params.id);

  if (isNaN(roleId)) {
    return new Response(JSON.stringify({ error: 'Invalid role ID' }), {
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

  if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }

  if (updates.length === 0) {
    return new Response(JSON.stringify({ error: 'No fields to update' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  values.push(roleId);
  await env.DB.prepare(
    `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const role = await env.DB.prepare('SELECT * FROM roles WHERE id = ?').bind(roleId).first();

  return new Response(JSON.stringify(role), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const roleId = parseInt(params.id);

  if (isNaN(roleId)) {
    return new Response(JSON.stringify({ error: 'Invalid role ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if any users have this role
  const users = await env.DB.prepare('SELECT COUNT(*) as cnt FROM users WHERE role_id = ?').bind(roleId).first();
  if (users && users.cnt > 0) {
    return new Response(JSON.stringify({ error: 'Cannot delete role with assigned users' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare('DELETE FROM roles WHERE id = ?').bind(roleId).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
