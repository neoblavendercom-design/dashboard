export async function onRequestPost(context) {
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

  const { game_key, score, accuracy, max_combo } = body;
  const validGames = ['whack', 'memory', 'typing', 'stroop', 'pattern'];

  if (!game_key || !validGames.includes(game_key)) {
    return new Response(JSON.stringify({ error: 'Invalid game_key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof score !== 'number' || score < 0) {
    return new Response(JSON.stringify({ error: 'Invalid score' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Reject obviously impossible scores (>2000 in 60 seconds)
  if (score > 2000) {
    return new Response(JSON.stringify({ error: 'Score exceeds maximum possible value' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check games enabled
  const enabledSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'games_enabled'"
  ).first();
  if (enabledSetting && enabledSetting.value !== 'true') {
    return new Response(JSON.stringify({ error: 'Games are currently disabled' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Check daily limit
  const limitSetting = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'daily_game_limit'"
  ).first();
  const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 2;

  const playsToday = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM game_plays WHERE user_id = ? AND play_date = ?'
  ).bind(user.id, today).first();
  const playCount = playsToday ? playsToday.cnt : 0;

  if (playCount >= dailyLimit) {
    return new Response(JSON.stringify({ error: 'Daily play limit reached', remaining: 0 }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Calculate grade
  let grade;
  if (score >= 500) grade = 'S';
  else if (score >= 350) grade = 'A';
  else if (score >= 200) grade = 'B';
  else if (score >= 100) grade = 'C';
  else grade = 'D';

  // Insert score
  await env.DB.prepare(
    'INSERT INTO game_plays (user_id, game_key, score, accuracy, grade, play_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(user.id, game_key, Math.round(score), accuracy || null, grade, today).run();

  // Evaluate game achievements
  const newBadges = [];

  // First Game
  const totalGames = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM game_plays WHERE user_id = ?'
  ).bind(user.id).first();
  if (totalGames && totalGames.cnt === 1) {
    await awardBadge(env.DB, user.id, 'first_game', newBadges);
  }

  // High Score (200+)
  if (score >= 200) {
    await awardBadge(env.DB, user.id, 'high_score', newBadges);
  }

  // S-Rank (500+)
  if (score >= 500) {
    await awardBadge(env.DB, user.id, 's_rank', newBadges);
  }

  // Sharpshooter (100% accuracy)
  if (accuracy !== undefined && accuracy >= 100) {
    await awardBadge(env.DB, user.id, 'sharpshooter', newBadges);
  }

  // Combo King (5x combo)
  if (max_combo && max_combo >= 5) {
    await awardBadge(env.DB, user.id, 'combo_king', newBadges);
  }

  // Well Rounded (all 5 games played)
  const distinctGames = await env.DB.prepare(
    'SELECT COUNT(DISTINCT game_key) as cnt FROM game_plays WHERE user_id = ?'
  ).bind(user.id).first();
  if (distinctGames && distinctGames.cnt >= 5) {
    await awardBadge(env.DB, user.id, 'well_rounded', newBadges);
  }

  // Daily Double (2 plays in one day)
  const playsNow = playCount + 1;
  if (playsNow >= 2) {
    await awardBadge(env.DB, user.id, 'daily_double', newBadges);
  }

  // Five-Day Player (play on 5 different days)
  const distinctDays = await env.DB.prepare(
    'SELECT COUNT(DISTINCT play_date) as cnt FROM game_plays WHERE user_id = ?'
  ).bind(user.id).first();
  if (distinctDays && distinctDays.cnt >= 5) {
    await awardBadge(env.DB, user.id, 'five_day_player', newBadges);
  }

  return new Response(JSON.stringify({
    score: Math.round(score),
    grade,
    accuracy: accuracy || null,
    remaining: dailyLimit - playsNow,
    new_badges: newBadges,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function awardBadge(db, userId, achievementKey, newBadges) {
  const ach = await db.prepare('SELECT id, name, icon FROM achievements WHERE key = ?').bind(achievementKey).first();
  if (!ach) return;

  const exists = await db.prepare(
    'SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
  ).bind(userId, ach.id).first();

  if (!exists) {
    await db.prepare(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)'
    ).bind(userId, ach.id).run();
    newBadges.push({ key: achievementKey, name: ach.name, icon: ach.icon });
  }
}
