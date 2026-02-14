export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;

  const achievements = await env.DB.prepare(
    `SELECT a.*, ua.earned_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ?
     ORDER BY a.category, a.id`
  ).bind(user.id).all();

  return new Response(JSON.stringify(achievements.results || []), {
    headers: { 'Content-Type': 'application/json' },
  });
}
