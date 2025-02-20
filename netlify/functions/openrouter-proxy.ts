import type { Handler, HandlerEvent } from '@netlify/functions';
import axios from 'axios';

// Ensure 'process.env' is recognized
declare const process: {
  env: {
    VITE_OPENROUTER_API_KEY: string;
  };
};

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // ✅ Fix: Ensure the API endpoint doesn't have duplicate paths
    const apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
    const sanitizedApiEndpoint = apiEndpoint.replace(/\/v1\/chat\/completions\/v1\/chat\/completions/g, "/v1/chat/completions");

    console.log("✅ Sanitized OpenRouter API Endpoint:", sanitizedApiEndpoint);

    const response = await axios.post(sanitizedApiEndpoint, body, {
      headers: {
        'Authorization': `Bearer ${process.env.VITE_OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gilded-raindrop-fd3c3f.netlify.app',
        'X-Title': 'Educational Content Processing System'
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error: unknown) {
    console.error('OpenRouter proxy error:', error);

    if (axios.isAxiosError(error)) {
      return {
        statusCode: error.response?.status || 500,
        body: JSON.stringify({
          error: error.response?.data || error.message
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
