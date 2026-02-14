export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;

  // Get earned badges count
  const badgeCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?'
  ).bind(user.id).first();

  // Get login streak
  const streak = await env.DB.prepare(
    'SELECT current_streak, longest_streak FROM login_streaks WHERE user_id = ?'
  ).bind(user.id).first();

  // Get role name
  const role = user.role_id
    ? await env.DB.prepare('SELECT name FROM roles WHERE id = ?').bind(user.role_id).first()
    : null;

  return new Response(JSON.stringify({
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    role_id: user.role_id,
    role_name: role ? role.name : null,
    is_admin: !!user.is_admin,
    badges_earned: badgeCount ? badgeCount.count : 0,
    current_streak: streak ? streak.current_streak : 0,
    longest_streak: streak ? streak.longest_streak : 0,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
