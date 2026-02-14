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

  const { email } = body;
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Always return success to prevent email enumeration
  const user = await env.DB.prepare('SELECT id, email FROM users WHERE email = ? AND is_active = 1').bind(email).first();

  if (user) {
    // Generate reset token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes, b => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await env.DB.prepare(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAt).run();

    // In production, send email via Resend/Mailchannels
    // For now, log the token (visible in worker logs)
    console.log(`Password reset token for ${email}: ${token}`);
  }

  return new Response(JSON.stringify({ message: 'If that email exists, a reset link has been sent.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
