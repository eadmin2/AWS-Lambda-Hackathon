import type { VAForm } from '../../types';

const VA_FORMS_API_URL = 'https://zgjmrmhoal.execute-api.us-east-2.amazonaws.com/prod';

// Improved mock data with more examples
const mockForms: VAForm[] = [
  {
    id: "10-10-EZ",
    type: "va_form",
    attributes: {
      form_name: "10-10EZ",
      url: "https://www.va.gov/vaforms/medical/pdf/10-10EZ-fillable.pdf",
      title: "Instructions and Enrollment Application for Health Benefits",
      first_issued_on: "2016-07-10",
      last_revision_on: "2020-01-17",
      pages: 5,
      sha256: "5fe171299ece147e8b456961a38e17f1391026f26e9e170229317bc95d9827b7",
      valid_pdf: true,
      form_usage: "Use VA Form 10-10EZ if you're a Veteran and want to apply for VA health care.",
      form_tool_intro: "",
      form_tool_url: "",
      form_details_url: "",
      form_type: "benefit",
      language: "en",
      deleted_at: null,
      related_forms: [],
      benefit_categories: [
        {
          name: "Health care",
          description: "VA health care"
        }
      ],
      va_form_administration: "Veterans Health Administration"
    }
  },
  {
    id: "21-526EZ",
    type: "va_form",
    attributes: {
      form_name: "21-526EZ",
      url: "https://www.va.gov/vaforms/va/pdf/VA21-526EZ.pdf",
      title: "Application for Disability Compensation and Related Compensation Benefits",
      first_issued_on: "2015-03-15",
      last_revision_on: "2023-01-15",
      pages: 8,
      sha256: "6ae172299ece147e8b456961a38e17f1391026f26e9e170229317bc95d9827c8",
      valid_pdf: true,
      form_usage: "Use VA Form 21-526EZ to apply for disability compensation.",
      form_tool_intro: "",
      form_tool_url: "",
      form_details_url: "",
      form_type: "benefit",
      language: "en",
      deleted_at: null,
      related_forms: [],
      benefit_categories: [
        {
          name: "Disability",
          description: "VA disability compensation"
        }
      ],
      va_form_administration: "Veterans Benefits Administration"
    }
  },
  {
    id: "21-22",
    type: "va_form",
    attributes: {
      form_name: "21-22",
      url: "https://www.va.gov/vaforms/va/pdf/VA21-22.pdf",
      title: "Appointment of Veterans Service Organization as Claimant's Representative",
      first_issued_on: "2010-01-01",
      last_revision_on: "2022-08-10",
      pages: 2,
      sha256: "7bf173399ece147e8b456961a38e17f1391026f26e9e170229317bc95d9827d9",
      valid_pdf: true,
      form_usage: "Use VA Form 21-22 to appoint a Veterans Service Organization as your representative.",
      form_tool_intro: "",
      form_tool_url: "",
      form_details_url: "",
      form_type: "standard",
      language: "en",
      deleted_at: null,
      related_forms: [],
      benefit_categories: [
        {
          name: "Records",
          description: "Representative appointment"
        }
      ],
      va_form_administration: "Veterans Benefits Administration"
    }
  }
];

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export async function searchVAForms(query: string): Promise<VAForm[]> {
  try {
    // Use proper query parameter format
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
    // Handle both array and single item responses
    if (Array.isArray(data)) {
      return data;
    } else if (data.data) {
      return Array.isArray(data.data) ? data.data : [data.data];
    }
    return [];
    
  } catch (error) {
    // fallback to mock data if fetch fails
    return mockForms.filter(form => 
      !query || 
      form.attributes.form_name.toLowerCase().includes(query.toLowerCase()) ||
      form.attributes.title.toLowerCase().includes(query.toLowerCase())
    );
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
    // fallback to mock data if fetch fails
    const form = mockForms.find(f => f.id === formId);
    if (!form) {
      throw new Error('Form not found');
    }
    return form;
  }
} 