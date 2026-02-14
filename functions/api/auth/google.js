export async function onRequestGet(context) {
  const { env, request } = context;
  const clientId = env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Google SSO not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google-callback`;

  const state = btoa(crypto.getRandomValues(new Uint8Array(16)).toString());

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': authUrl.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
}
