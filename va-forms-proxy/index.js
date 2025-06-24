const fetch = require('node-fetch');

const VA_FORMS_API_URL = 'https://sandbox-api.va.gov/services/va_forms/v0';
const API_KEY = process.env.VA_FORMS_API_KEY;

exports.handler = async (event) => {
  try {
    // Log the event for debugging
    console.log('EVENT:', JSON.stringify(event));

    let path = event.path || '/forms';
    // Remove the stage prefix (e.g., /prod) if present
    if (event.requestContext && event.requestContext.path && event.requestContext.stage) {
      const stagePrefix = `/${event.requestContext.stage}`;
      if (path.startsWith(stagePrefix)) {
        path = path.slice(stagePrefix.length);
      }
    }
    let url = VA_FORMS_API_URL + path;

    // Add query string if present
    if (event.queryStringParameters) {
      const params = new URLSearchParams(event.queryStringParameters).toString();
      url += '?' + params;
    }

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'apikey': API_KEY
    };

    const response = await fetch(url, { headers });
    const data = await response.text();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
}; 