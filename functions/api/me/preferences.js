export async function onRequestPatch(context) {
  const { request, env, data } = context;
  const user = data.user;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { app_id, open_new_tab } = body;
  if (app_id === undefined || open_new_tab === undefined) {
    return new Response(JSON.stringify({ error: 'app_id and open_new_tab are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await env.DB.prepare(
    `INSERT INTO user_app_prefs (user_id, app_id, open_new_tab)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, app_id) DO UPDATE SET open_new_tab = excluded.open_new_tab`
  ).bind(user.id, app_id, open_new_tab ? 1 : 0).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
