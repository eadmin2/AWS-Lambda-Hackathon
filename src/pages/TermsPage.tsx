import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { FileText } from 'lucide-react';

const TermsPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <FileText className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: March 15, 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Agreement to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                By accessing or using our service, you agree to be bound by these Terms of Service. 
                If you disagree with any part of the terms, you may not access the service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Description of Service</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We provide an AI-powered service that analyzes medical documents to estimate VA disability ratings. 
                Our service includes:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Document upload and storage</li>
                <li>AI analysis of medical conditions</li>
                <li>VA disability rating estimates</li>
                <li>Detailed condition reports</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                To use our service, you must:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Register for an account with accurate information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Payment terms for our service include:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>All fees are charged in advance</li>
                <li>Subscriptions auto-renew unless cancelled</li>
                <li>Refunds are provided according to our refund policy</li>
                <li>Prices may change with 30 days notice</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. User Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Use the service only for lawful purposes</li>
                <li>Not share account access with others</li>
                <li>Not attempt to reverse engineer the service</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                All content, features, and functionality of our service are owned by us and protected by copyright, 
                trademark, and other intellectual property laws. You may not reproduce, distribute, modify, or create 
                derivative works of our service without explicit permission.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We provide estimates based on available information but do not guarantee specific VA disability ratings. 
                We are not liable for decisions made based on our estimates or for any consequential damages arising 
                from the use of our service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We reserve the right to modify these terms at any time. We will notify users of any material changes 
                via email or through our service. Continued use of the service after changes constitutes acceptance 
                of the new terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-4">
                <p className="text-gray-600">Email: legal@varating.com</p>
                <p className="text-gray-600">Phone: 1-800-VA-RATING</p>
                <p className="text-gray-600">Address: 123 Veterans Way, Suite 100, Washington, DC 20001</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default TermsPage;