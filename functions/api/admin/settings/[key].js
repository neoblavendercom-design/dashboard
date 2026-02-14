export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const key = params.key;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (body.value === undefined) {
    return new Response(JSON.stringify({ error: 'value is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await env.DB.prepare('SELECT * FROM settings WHERE key = ?').bind(key).first();
  if (!existing) {
    return new Response(JSON.stringify({ error: 'Setting not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare('UPDATE settings SET value = ? WHERE key = ?').bind(String(body.value), key).run();

  return new Response(JSON.stringify({ key, value: String(body.value), description: existing.description }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
