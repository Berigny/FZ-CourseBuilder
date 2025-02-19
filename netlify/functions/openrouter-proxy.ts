import type { Handler } from '@netlify/functions';
import axios from 'axios';

// Ensure environment variables are loaded correctly
const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('❌ Missing OpenRouter API Key!');
}

// ✅ Declare only one handler function
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      body,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`, // ✅ Uses the loaded API key
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://gilded-raindrop-fd3c3f.netlify.app',
          'X-Title': 'Educational Content Processing System'
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error('❌ OpenRouter proxy error:', error);

    if (axios.isAxiosError(error)) {
      return {
        statusCode: error.response?.status || 500,
        body: JSON.stringify({
          error: error.response?.data || error.message,
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
