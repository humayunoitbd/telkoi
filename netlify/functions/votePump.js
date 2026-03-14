const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  // CORS প্রি-ফ্লাইট রিকোয়েস্ট হ্যান্ডেল করা
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { pumpId, isAvailable } = JSON.parse(event.body);

    if (!pumpId || isAvailable === undefined) {
      return { statusCode: 400, body: 'Missing required parameters' };
    }

    // কোন কলাম আপডেট হবে সেটি নির্ধারণ করা
    const voteColumn = isAvailable ? 'yes_votes' : 'no_votes';

    // ডাটাবেজ আপডেট করা
    const query = `
      UPDATE pumps 
      SET ${voteColumn} = ${voteColumn} + 1, last_updated = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [pumpId]);

    if (rows.length === 0) {
      return { statusCode: 404, body: 'Pump not found' };
    }

    // আপডেট হওয়া নতুন ডাটা রিটার্ন করা
    const updatedPump = rows[0];
    const formattedPump = {
      id: updatedPump.id,
      name: updatedPump.name,
      area: updatedPump.area,
      yesVotes: updatedPump.yes_votes,
      noVotes: updatedPump.no_votes,
      lastUpdated: updatedPump.last_updated
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formattedPump)
    };
  } catch (error) {
    console.error('Error updating vote:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};