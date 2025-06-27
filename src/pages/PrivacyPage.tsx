import React from "react";
import PageLayout from "../components/layout/PageLayout";
import { Shield } from "lucide-react";

const PrivacyPage: React.FC = () => {
  return (
    <PageLayout>
      {/* Key Privacy Features - Hero Section */}
      <section className="py-16 bg-primary-900 text-white" id="privacy-features">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto bg-primary-700 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" focusable="false" role="img"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354l7.071 2.357A2 2 0 0121 8.59v3.6c0 5.523-3.807 10.74-9 12-5.193-1.26-9-6.477-9-12V8.59a2 2 0 011.929-1.879L12 4.354z" /></svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Key Privacy Features</h1>
            <p className="text-2xl text-blue-100 max-w-2xl mx-auto">Your privacy and security are our mission—built for veterans, by veterans, with Amazon Bedrock's industry-leading safeguards.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">No Data Retention or AI Training</h3>
              <p className="text-blue-100">Amazon Bedrock does not retain your content or queries. None of your data is used to train AI models—not even third-party models like Claude by Anthropic. Every query is processed securely and then deleted.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m0 0l-2-2m2 2l2-2m-6-6V6a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">No Sharing with Model Providers</h3>
              <p className="text-blue-100">Your data is not shared with Anthropic, AI21 Labs, or any other model providers. Your privacy stays protected at every step.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 11V7a5 5 0 00-10 0v4" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">End-to-End Encryption</h3>
              <p className="text-blue-100">All customer data is encrypted both in transit and at rest. You can even use your own AWS Key Management Service (KMS) keys for extra control.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v-2a4 4 0 10-8 0v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M20 12v-2a4 4 0 10-8 0v2" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Strict Compliance Standards</h3>
              <p className="text-blue-100">Amazon Bedrock aligns with SOC 2, ISO 27001, GDPR, is HIPAA eligible, and follows data residency rules. We meet or exceed government and healthcare privacy standards.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">Dedicated AWS Model Network</h3>
              <p className="text-blue-100">AWS uses isolated model deployment accounts and keeps all processing inside the AWS network. Neither AWS nor third parties have access to your inputs or outputs.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">We Never Sell or Share Your Data</h3>
              <p className="text-blue-100">At VARatingAssistant.com, we never sell, release, or share your personal information. Period. Your trust is our promise.</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <span className="inline-block px-6 py-3 rounded-full bg-blue-800 text-lg font-semibold text-white shadow-md">Your privacy is our mission.</span>
          </div>
        </div>
      </section>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Shield className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: June 1, 2025
          </p>
        </div>
        <div className="prose prose-blue max-w-none space-y-8">
          <section>
            <h2>1. Who We Are</h2>
            <p>
              VA Rating Assistant ("we", "us", "our") provides a platform to
              help users estimate VA disability ratings and manage related
              documents. For privacy matters, contact:{" "}
              <a
                href="mailto:support@fastwebcreations.com"
                className="text-primary-600 underline"
              >
                support@fastwebcreations.com
              </a>{" "}
              or 522 W Riverside Ave STE N Spokane, WA 99201-0580.
            </p>
          </section>

          <section>
            <h2>2. What Data We Collect</h2>
            <ul>
              <li>Account information: Name, email, user ID, admin level</li>
              <li>Billing information: Phone number, address (via Stripe)</li>
              <li>Uploaded documents (may include health records)</li>
              <li>Document metadata</li>
              <li>Disability estimates</li>
              <li>Payment and subscription status (via Stripe)</li>
              <li>Order history (via Stripe)</li>
              <li>Support tickets (if submitted)</li>
              <li>Admin activity logs</li>
              <li>Analytics and usage data</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>Provide and improve our services</li>
              <li>Process payments and manage subscriptions</li>
              <li>Communicate with you (e.g., notifications, support)</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2>4. Special Category Data</h2>
            <p>
              Some uploaded documents may contain health information. This data
              is encrypted, only accessed for service purposes, and never sold
              or shared with third parties.
            </p>
          </section>

          <section>
            <h2>5. How We Store and Protect Your Data</h2>
            <ul>
              <li>
                Data is stored securely in Supabase (database and encrypted S3
                storage).
              </li>
              <li>
                Health records and sensitive documents are encrypted at rest.
              </li>
              <li>Access is restricted to authorized users and admins.</li>
              <li>
                We implement technical and organizational measures to protect
                your data.
              </li>
            </ul>
          </section>

          <section>
            <h2>6. Third-Party Processors</h2>
            <p>We use trusted third parties to process your data:</p>
            <ul>
              <li>
                <strong>Stripe</strong> (payments, billing info)
              </li>
              <li>
                <strong>Supabase</strong> (database, authentication, storage)
              </li>
              <li>
                <strong>Analytics provider</strong> (if used; e.g., Google
                Analytics)
              </li>
            </ul>
            <p>
              These providers are contractually required to protect your data
              and comply with GDPR.
            </p>
          </section>

          <section>
            <h2>7. Data Retention &amp; Deletion</h2>
            <ul>
              <li>
                You can delete your account and uploaded documents at any time.
              </li>
              <li>Payment and billing data is retained per Stripe's policy.</li>
              <li>
                Support tickets and admin logs are retained as needed for
                support and audit purposes.
              </li>
              <li>Data is deleted or anonymized when no longer required.</li>
            </ul>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul>
              <li>Access your data</li>
              <li>Rectify inaccurate data</li>
              <li>Erase your data ("right to be forgotten")</li>
              <li>Restrict or object to processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time (where applicable)</li>
              <li>Lodge a complaint with a supervisory authority</li>
            </ul>
            <p>
              To exercise your rights, contact us at{" "}
              <a
                href="mailto:support@fastwebcreations.com"
                className="text-primary-600 underline"
              >
                support@fastwebcreations.com
              </a>{" "}
              or 522 W Riverside Ave STE N Spokane, WA 99201-0580.
            </p>
          </section>

          <section>
            <h2>9. International Transfers</h2>
            <p>
              Your data may be processed outside the EEA. We ensure appropriate
              safeguards are in place (e.g., Standard Contractual Clauses).
            </p>
          </section>

          <section>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this policy. Changes will be posted on this page
              with a new "last updated" date.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              For privacy questions or requests, contact:{" "}
              <a
                href="mailto:support@fastwebcreations.com"
                className="text-primary-600 underline"
              >
                support@fastwebcreations.com
              </a>{" "}
              or 522 W Riverside Ave STE N Spokane, WA 99201-0580.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default PrivacyPage;
