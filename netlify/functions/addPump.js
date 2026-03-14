const { Pool } = require('pg');

// আপনার Netlify-তে থাকা ভেরিয়েবল নামটি ব্যবহার করা হচ্ছে
const pool = new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
  // CORS Error সমাধান
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
    const { name, area, lat, lng } = JSON.parse(event.body);

    // নাম এবং এলাকা অবশ্যই থাকতে হবে
    if (!name || !area) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Name and Area are required' }) 
      };
    }

    // ডাটাবেজে নতুন পাম্প ইনসার্ট করার কমান্ড
    const query = `
      INSERT INTO pumps (name, area, lat, lng, maps_link, yes_votes, no_votes) 
      VALUES ($1, $2, $3, $4, NULL, 0, 0)
      RETURNING *
    `;
    const values = [name, area, lat || null, lng || null];
    
    const { rows } = await pool.query(query, values);
    const newPump = rows[0];

    // ডাটা সেভ হওয়ার পর ফ্রন্টএন্ডে পাঠানোর জন্য ফরমেট করা
    const formattedPump = {
      id: newPump.id,
      name: newPump.name,
      area: newPump.area,
      lat: newPump.lat ? parseFloat(newPump.lat) : null,
      lng: newPump.lng ? parseFloat(newPump.lng) : null,
      mapsLink: newPump.maps_link || null,
      yesVotes: newPump.yes_votes,
      noVotes: newPump.no_votes,
      lastUpdated: newPump.last_updated
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
    console.error('Error adding pump:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};