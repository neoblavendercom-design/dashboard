export async function onRequestGet(context) {
  const { env, data } = context;
  const user = data.user;
  const today = new Date().toISOString().split('T')[0];

  // Get daily limit from settings
  const limitSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'daily_game_limit'"
  ).first();
  const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 2;

  // Get games_enabled
  const enabledSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'games_enabled'"
  ).first();
  const gamesEnabled = enabledSetting ? enabledSetting.value === 'true' : true;

  // Get game duration
  const durationSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'game_duration_seconds'"
  ).first();
  const gameDuration = durationSetting ? parseInt(durationSetting.value) : 60;

  // Count today's plays
  const playsToday = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM game_plays WHERE user_id = ? AND play_date = ?'
  ).bind(user.id, today).first();
  const playCount = playsToday ? playsToday.cnt : 0;

  // Personal bests per game
  const bests = await env.DB.prepare(
    'SELECT game_key, MAX(score) as best_score, MAX(accuracy) as best_accuracy FROM game_plays WHERE user_id = ? GROUP BY game_key'
  ).bind(user.id).all();

  const personalBests = {};
  if (bests.results) {
    for (const b of bests.results) {
      personalBests[b.game_key] = {
        score: b.best_score,
        accuracy: b.best_accuracy,
      };
    }
  }

  return new Response(JSON.stringify({
    plays_today: playCount,
    daily_limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - playCount),
    personal_bests: personalBests,
    games_enabled: gamesEnabled,
    game_duration: gameDuration,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
