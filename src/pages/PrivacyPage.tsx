import React from "react";
import PageLayout from "../components/layout/PageLayout";
import { Shield } from "lucide-react";

const PrivacyPage: React.FC = () => {
  return (
    <PageLayout>
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
