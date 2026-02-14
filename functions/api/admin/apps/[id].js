export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const appId = parseInt(params.id);

  if (isNaN(appId)) {
    return new Response(JSON.stringify({ error: 'Invalid app ID' }), {
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
  if (body.url !== undefined) { updates.push('url = ?'); values.push(body.url); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.icon !== undefined) { updates.push('icon = ?'); values.push(body.icon); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(body.sort_order); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

  if (updates.length > 0) {
    values.push(appId);
    await env.DB.prepare(
      `UPDATE apps SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // Update role assignments if provided
  if (body.role_ids !== undefined) {
    await env.DB.prepare('DELETE FROM app_roles WHERE app_id = ?').bind(appId).run();
    for (const roleId of body.role_ids) {
      await env.DB.prepare(
        'INSERT INTO app_roles (app_id, role_id) VALUES (?, ?)'
      ).bind(appId, roleId).run();
    }
  }

  const app = await env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(appId).first();

  return new Response(JSON.stringify(app), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const appId = parseInt(params.id);

  if (isNaN(appId)) {
    return new Response(JSON.stringify({ error: 'Invalid app ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare('DELETE FROM apps WHERE id = ?').bind(appId).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
