export async function onRequestPost(context) {
  const { env, data, params } = context;
  const user = data.user;
  const appId = parseInt(params.id);

  if (isNaN(appId)) {
    return new Response(JSON.stringify({ error: 'Invalid app ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Record launch
  await env.DB.prepare(
    'INSERT INTO app_launches (user_id, app_id, launched_at, launch_date) VALUES (?, ?, ?, ?)'
  ).bind(user.id, appId, now.toISOString(), today).run();

  // Evaluate dashboard achievements
  const newBadges = [];

  // Explorer: Launch 5 different apps in one day
  const distinctToday = await env.DB.prepare(
    'SELECT COUNT(DISTINCT app_id) as cnt FROM app_launches WHERE user_id = ? AND launch_date = ?'
  ).bind(user.id, today).first();

  if (distinctToday && distinctToday.cnt >= 5) {
    const ach = await env.DB.prepare('SELECT id FROM achievements WHERE key = ?').bind('explorer').first();
    if (ach) {
      const exists = await env.DB.prepare(
        'SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
      ).bind(user.id, ach.id).first();
      if (!exists) {
        await env.DB.prepare(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
        ).bind(user.id, ach.id).run();
        newBadges.push({ key: 'explorer', name: 'Explorer', icon: '🧭' });
      }
    }
  }

  // Navigator: Launch every app assigned to your role
  if (user.role_id) {
    const totalApps = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM app_roles WHERE role_id = ?'
    ).bind(user.role_id).first();
    const launchedApps = await env.DB.prepare(
      `SELECT COUNT(DISTINCT al.app_id) as cnt FROM app_launches al
       JOIN app_roles ar ON ar.app_id = al.app_id AND ar.role_id = ?
       WHERE al.user_id = ?`
    ).bind(user.role_id, user.id).first();

    if (totalApps && launchedApps && launchedApps.cnt >= totalApps.cnt && totalApps.cnt > 0) {
      const ach = await env.DB.prepare('SELECT id FROM achievements WHERE key = ?').bind('navigator').first();
      if (ach) {
        const exists = await env.DB.prepare(
          'SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
        ).bind(user.id, ach.id).first();
        if (!exists) {
          await env.DB.prepare(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
          ).bind(user.id, ach.id).run();
          newBadges.push({ key: 'navigator', name: 'Navigator', icon: '🗺️' });
        }
      }
    }
  }

  // Creature of Habit: Launch the same app 10 days in a row
  const consecutiveDays = await env.DB.prepare(
    `SELECT DISTINCT launch_date FROM app_launches
     WHERE user_id = ? AND app_id = ?
     ORDER BY launch_date DESC LIMIT 10`
  ).bind(user.id, appId).all();

  if (consecutiveDays.results && consecutiveDays.results.length >= 10) {
    // Check if the 10 dates are consecutive
    let consecutive = true;
    const dates = consecutiveDays.results.map(r => r.launch_date).sort().reverse();
    for (let i = 0; i < dates.length - 1; i++) {
      const d1 = new Date(dates[i]);
      const d2 = new Date(dates[i + 1]);
      const diff = (d1 - d2) / (1000 * 60 * 60 * 24);
      if (diff !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      const ach = await env.DB.prepare('SELECT id FROM achievements WHERE key = ?').bind('creature_of_habit').first();
      if (ach) {
        const exists = await env.DB.prepare(
          'SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
        ).bind(user.id, ach.id).first();
        if (!exists) {
          await env.DB.prepare(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
          ).bind(user.id, ach.id).run();
          newBadges.push({ key: 'creature_of_habit', name: 'Creature of Habit', icon: '🔁' });
        }
      }
    }
  }

  return new Response(JSON.stringify({ success: true, new_badges: newBadges }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
