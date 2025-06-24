import type { VAForm } from '../../types';

const VA_FORMS_API_URL = 'https://zgjmrmhoal.execute-api.us-east-2.amazonaws.com/prod';

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export async function searchVAForms(query: string): Promise<VAForm[]> {
  try {
    const queryParams = new URLSearchParams({
      query: query || '',
      page: '1',
      per_page: '100'
    }).toString();
    const response = await fetch(`${VA_FORMS_API_URL}/forms?${queryParams}`, {
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid VA Forms API key');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      throw new Error(`VA Forms API request failed: ${errorData.errors?.[0]?.detail || response.statusText}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      return data;
    } else if (data.data) {
      return Array.isArray(data.data) ? data.data : [data.data];
    }
    return [];
  } catch (error) {
    // On error, return empty array
    return [];
  }
}

export async function getVAForm(formId: string): Promise<VAForm> {
  try {
    const response = await fetch(`${VA_FORMS_API_URL}/forms/${encodeURIComponent(formId)}`, {
      headers,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 404) {
        throw new Error(`VA Form ${formId} not found`);
      }
      throw new Error(`Failed to fetch VA form: ${errorData.errors?.[0]?.detail || response.statusText}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    // On error, throw not found error
    throw new Error('Form not found');
  }
} 