export async function onRequestGet(context) {
  const { env } = context;

  const settings = await env.DB.prepare('SELECT * FROM settings ORDER BY key').all();

  return new Response(JSON.stringify(settings.results || []), {
    headers: { 'Content-Type': 'application/json' },
  });
}
