const axios = require('axios');

const BASE_URL = 'https://sandbox-api.va.gov/services/va_facilities/v1';
const API_KEY = process.env.VA_FACILITIES_API_KEY;

exports.handler = async (event) => {
  try {
    // Support API Gateway proxy integration event structure
    let path = event.path || '/facilities';
    if (path.startsWith('/prod/')) path = path.replace('/prod', '');
    if (path === '' || path === '/') path = '/facilities';
    const queryString = event.queryStringParameters || {};
    const method = event.httpMethod || 'GET';
    let url = BASE_URL + path;
    // Attach query params
    const params = new URLSearchParams(queryString).toString();
    if (params) {
      url += `?${params}`;
    }
    const headers = {
      'apikey': API_KEY,
      'Accept': 'application/json',
    };
    const axiosConfig = {
      method,
      url,
      headers,
    };
    const response = await axios(axiosConfig);
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
      body: JSON.stringify({ message: error.message, data: error.response?.data }),
    };
  }
}; 