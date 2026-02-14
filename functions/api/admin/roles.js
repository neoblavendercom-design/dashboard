export async function onRequestGet(context) {
  const { env } = context;

  const roles = await env.DB.prepare('SELECT * FROM roles ORDER BY id').all();

  return new Response(JSON.stringify(roles.results || []), {
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

  const { name, description } = body;
  if (!name) {
    return new Response(JSON.stringify({ error: 'name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await env.DB.prepare('SELECT id FROM roles WHERE name = ?').bind(name).first();
  if (existing) {
    return new Response(JSON.stringify({ error: 'Role name already exists' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await env.DB.prepare(
    'INSERT INTO roles (name, description) VALUES (?, ?)'
  ).bind(name, description || null).run();

  return new Response(JSON.stringify({ id: result.meta.last_row_id, name, description }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
