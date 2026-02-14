export async function onRequestGet(context) {
  const { env } = context;

  const apps = await env.DB.prepare(
    'SELECT * FROM apps ORDER BY sort_order, name'
  ).all();

  // Get role assignments for each app
  const appRoles = await env.DB.prepare(
    'SELECT app_id, role_id FROM app_roles'
  ).all();

  const roleMap = {};
  if (appRoles.results) {
    for (const ar of appRoles.results) {
      if (!roleMap[ar.app_id]) roleMap[ar.app_id] = [];
      roleMap[ar.app_id].push(ar.role_id);
    }
  }

  const result = (apps.results || []).map(app => ({
    ...app,
    role_ids: roleMap[app.id] || [],
  }));

  return new Response(JSON.stringify(result), {
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

  const { name, url, description, icon, sort_order, role_ids } = body;

  if (!name || !url) {
    return new Response(JSON.stringify({ error: 'name and url are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await env.DB.prepare(
    'INSERT INTO apps (name, url, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, url, description || null, icon || null, sort_order || 0).run();

  const appId = result.meta.last_row_id;

  // Assign roles
  if (role_ids && role_ids.length > 0) {
    for (const roleId of role_ids) {
      await env.DB.prepare(
        'INSERT INTO app_roles (app_id, role_id) VALUES (?, ?)'
      ).bind(appId, roleId).run();
    }
  }

  return new Response(JSON.stringify({ id: appId, name, url }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
