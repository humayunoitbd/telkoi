const { Pool } = require('pg');

// Netlify Environment Variables থেকে ডাটাবেজ URL নেওয়া হবে
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon DB এর জন্য এটি প্রয়োজন হতে পারে
});

exports.handler = async (event, context) => {
  try {
    // ডাটাবেজ থেকে সব পাম্পের তথ্য আনা হচ্ছে
    const { rows } = await pool.query('SELECT * FROM pumps ORDER BY area, name');
    
    // ডাটা ফরমেট করে পাঠানো
    const formattedPumps = rows.map(pump => ({
      id: pump.id,
      name: pump.name,
      area: pump.area,
      lat: parseFloat(pump.lat),
      lng: parseFloat(pump.lng),
      yesVotes: pump.yes_votes,
      noVotes: pump.no_votes,
      lastUpdated: pump.last_updated
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // CORS error এড়াতে
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formattedPumps)
    };
  } catch (error) {
    console.error('Error fetching pumps:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};