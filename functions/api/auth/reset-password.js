import { hashPassword } from './login.js';

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

  const { token, password } = body;
  if (!token || !password) {
    return new Response(JSON.stringify({ error: 'Token and new password are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 8) {
    return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Find valid token
  const resetToken = await env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime("now")'
  ).bind(token).first();

  if (!resetToken) {
    return new Response(JSON.stringify({ error: 'Invalid or expired reset token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Hash new password and update
  const passwordHash = await hashPassword(password);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, resetToken.user_id).run();

  // Mark token as used
  await env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').bind(resetToken.id).run();

  return new Response(JSON.stringify({ message: 'Password reset successfully' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
