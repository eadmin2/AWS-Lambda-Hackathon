import React from "react";
import PageLayout from "../components/layout/PageLayout";
import { FileText } from "lucide-react";

const TermsPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <FileText className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: June 1, 2025
          </p>
        </div>
        <div className="prose prose-blue max-w-none space-y-8">
          <section>
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using our service, you agree to be bound by these
              Terms of Service. If you disagree with any part of the terms, you
              may not access the service.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              We provide an AI-powered service that analyzes medical documents
              to estimate VA disability ratings. Our service includes:
            </p>
            <ul>
              <li>Document upload and storage</li>
              <li>AI analysis of medical conditions</li>
              <li>VA disability rating estimates</li>
              <li>Detailed condition reports</li>
            </ul>
          </section>

          <section>
            <h2>3. User Accounts</h2>
            <p>To use our service, you must:</p>
            <ul>
              <li>Be at least 18 years old</li>
              <li>Register for an account with accurate information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2>4. Payment Terms</h2>
            <p>Payment terms for our service include:</p>
            <ul>
              <li>All fees are charged in advance</li>
              <li>Subscriptions auto-renew unless cancelled</li>
              <li>Refunds are provided according to our refund policy</li>
              <li>Prices may change with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2>5. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Use the service only for lawful purposes</li>
              <li>Not share account access with others</li>
              <li>Not attempt to reverse engineer the service</li>
            </ul>
          </section>

          <section>
            <h2>6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of our service are owned
              by us and protected by copyright, trademark, and other
              intellectual property laws. You may not reproduce, distribute,
              modify, or create derivative works of our service without explicit
              permission.
            </p>
          </section>

          <section>
            <h2>7. Limitation of Liability</h2>
            <p>
              We provide estimates based on available information but do not
              guarantee specific VA disability ratings. We are not liable for
              decisions made based on our estimates or for any consequential
              damages arising from the use of our service.
            </p>
          </section>

          <section>
            <h2>8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will
              notify users of any material changes via email or through our
              service. Continued use of the service after changes constitutes
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2>9. Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us at:
            </p>
            <ul>
              <li>
                Email: <a href="/contact" className="text-primary-600 underline">Contact Us</a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default TermsPage;
