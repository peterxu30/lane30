import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, score, mode } = req.body ?? {};

  const cleanName = typeof name === 'string' ? name.trim().slice(0, 50) : '';
  if (!cleanName) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 300) {
    return res.status(400).json({ error: 'score must be an integer 0–300' });
  }
  if (mode !== 'NORMAL' && mode !== 'MIGA') {
    return res.status(400).json({ error: 'mode must be NORMAL or MIGA' });
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`
    INSERT INTO scores (player_name, score, game_mode)
    VALUES (${cleanName}, ${score}, ${mode})
  `;

  return res.status(201).json({ ok: true });
}
