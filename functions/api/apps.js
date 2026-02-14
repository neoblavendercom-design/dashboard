export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;

  let apps;
  if (user.is_admin) {
    // Admins see all active apps
    apps = await env.DB.prepare(
      'SELECT * FROM apps WHERE is_active = 1 ORDER BY sort_order, name'
    ).all();
  } else if (user.role_id) {
    // Regular users see apps assigned to their role
    apps = await env.DB.prepare(
      `SELECT a.* FROM apps a
       JOIN app_roles ar ON ar.app_id = a.id
       WHERE ar.role_id = ? AND a.is_active = 1
       ORDER BY a.sort_order, a.name`
    ).bind(user.role_id).all();
  } else {
    apps = { results: [] };
  }

  // Get user preferences for open_new_tab
  const prefs = await env.DB.prepare(
    'SELECT app_id, open_new_tab FROM user_app_prefs WHERE user_id = ?'
  ).bind(user.id).all();

  const prefMap = {};
  if (prefs.results) {
    for (const p of prefs.results) {
      prefMap[p.app_id] = !!p.open_new_tab;
    }
  }

  const result = (apps.results || []).map(app => ({
    ...app,
    open_new_tab: prefMap[app.id] !== undefined ? prefMap[app.id] : true,
  }));

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}
