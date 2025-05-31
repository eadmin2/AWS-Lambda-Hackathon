import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { HelpCircle } from 'lucide-react';

const FAQPage: React.FC = () => {
  const faqs = [
    {
      question: 'How accurate are the VA disability rating estimates?',
      answer: 'Our AI-powered system is trained on thousands of VA disability cases and official VA rating criteria. While estimates are highly accurate, they are not guaranteed as final VA decisions consider additional factors during official reviews.'
    },
    {
      question: 'How secure are my medical documents?',
      answer: 'We use bank-level encryption and security measures to protect your documents. Our system is HIPAA-compliant, and we never share your medical information with third parties.'
    },
    {
      question: 'How long does it take to get my rating estimate?',
      answer: 'Most documents are analyzed within minutes. Complex documents may take up to an hour for thorough analysis.'
    },
    {
      question: 'Can I use this service if I\'m already receiving VA disability benefits?',
      answer: 'Yes! Many veterans use our service to estimate potential increases based on new conditions or worsening symptoms.'
    },
    {
      question: 'What types of documents should I upload?',
      answer: 'Upload medical records, treatment histories, and service-connected condition documentation. The more comprehensive the documentation, the more accurate our estimate.'
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription anytime from your account settings. Access will continue until the end of your billing period.'
    }
  ];

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <HelpCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="mt-4 text-lg text-gray-600">
            Find answers to common questions about our VA disability rating estimation service.
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};

export default FAQPage;