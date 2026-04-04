import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode } = req.query;
  if (mode !== 'NORMAL' && mode !== 'MIGA') {
    return res.status(400).json({ error: 'mode must be NORMAL or MIGA' });
  }

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT player_name, score, created_at
    FROM scores
    WHERE game_mode = ${mode}
    ORDER BY score DESC, created_at ASC
    LIMIT 10
  `;

  res.setHeader('Cache-Control', 's-maxage=10');
  return res.status(200).json(rows);
}
