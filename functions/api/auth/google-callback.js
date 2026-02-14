import { createJWT } from '../_middleware.js';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return new Response(`<script>window.location.href='/index.html?error=google_denied';</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/google-callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return new Response(`<script>window.location.href='/index.html?error=google_token_failed';</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const tokens = await tokenRes.json();

  // Get user info
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return new Response(`<script>window.location.href='/index.html?error=google_userinfo_failed';</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const googleUser = await userInfoRes.json();

  // Find matching user by email or google_sub
  let user = await env.DB.prepare(
    'SELECT id, username, email, display_name, role_id, is_admin, is_active, google_sub FROM users WHERE google_sub = ? OR email = ?'
  ).bind(googleUser.sub, googleUser.email).first();

  if (!user || !user.is_active) {
    return new Response(`<script>window.location.href='/index.html?error=no_account';</script>`, {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Link google_sub if not already linked
  if (!user.google_sub) {
    await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(googleUser.sub, user.id).run();
  }

  // Update last_login
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  await env.DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(now.toISOString(), user.id).run();

  // Update login streak
  const streak = await env.DB.prepare('SELECT * FROM login_streaks WHERE user_id = ?').bind(user.id).first();
  if (streak) {
    const lastDate = streak.last_login_date;
    if (lastDate !== today) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = lastDate === yesterdayStr ? streak.current_streak + 1 : 1;
      const longest = Math.max(newStreak, streak.longest_streak);
      await env.DB.prepare(
        'UPDATE login_streaks SET current_streak = ?, longest_streak = ?, last_login_date = ? WHERE user_id = ?'
      ).bind(newStreak, longest, today, user.id).run();
    }
  } else {
    await env.DB.prepare(
      'INSERT INTO login_streaks (user_id, current_streak, longest_streak, last_login_date) VALUES (?, 1, 1, ?)'
    ).bind(user.id, today).run();
  }

  // Create JWT
  const token = await createJWT({
    sub: user.id,
    username: user.username,
    is_admin: user.is_admin,
  }, env);

  return new Response(`<script>window.location.href='/dashboard.html';</script>`, {
    headers: {
      'Content-Type': 'text/html',
      'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
    },
  });
}
