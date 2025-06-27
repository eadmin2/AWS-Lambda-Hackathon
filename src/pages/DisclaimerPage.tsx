import React, { useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import { AlertTriangle } from "lucide-react";

const DisclaimerPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <AlertTriangle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            Medical Disclaimer
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: June 27, 2025
          </p>
        </div>
        <div className="prose prose-blue max-w-none space-y-8">
          <section>
            <h2>Not Medical Advice</h2>
            <p>
              The content and services provided by VA Rating Assistant are for
              informational purposes only and are not intended to be a
              substitute for professional medical advice, diagnosis, or
              treatment. Always seek the advice of your physician or other
              qualified health provider with any questions you may have
              regarding a medical condition.
            </p>
          </section>

          <section>
            <h2>Estimates Only</h2>
            <p>
              Our disability rating estimates are generated using AI analysis of
              provided documentation. These estimates are not official VA
              ratings and should not be considered as guaranteed outcomes of VA
              disability claims. The Department of Veterans Affairs makes all
              final determinations regarding disability ratings.
            </p>
          </section>

          <section>
            <h2>Emergency Situations</h2>
            <p>
              Do not use our service for emergency medical situations. If you
              have a medical emergency, immediately call your doctor or 911. Our
              service is not intended to provide emergency medical advice or
              treatment recommendations.
            </p>
          </section>

          <section>
            <h2>No Doctor-Patient Relationship</h2>
            <p>
              Using our service does not create a doctor-patient relationship.
              Our AI analysis and estimates do not constitute medical advice or
              treatment recommendations. We do not practice medicine or provide
              medical services through our platform.
            </p>
          </section>

          <section>
            <h2>Accuracy of Information</h2>
            <p>
              While we strive to provide accurate information and estimates, we
              make no representations or warranties about the accuracy,
              completeness, or reliability of any content or estimates provided
              through our service. Medical knowledge and VA rating criteria may
              change over time.
            </p>
          </section>

          <section>
            <h2>Individual Results May Vary</h2>
            <p>
              Every veteran's situation is unique. The estimates and information
              provided through our service are based on general patterns and
              historical data. Your actual VA disability rating may differ from
              our estimates based on various factors considered during the
              official VA review process.
            </p>
          </section>

          <section>
            <h2>Consult Qualified Professionals</h2>
            <p>
              We recommend consulting with qualified medical professionals and
              VA-accredited representatives for personalized advice regarding
              your medical conditions and VA disability claims. Our service
              should be used as a supplementary tool, not a replacement for
              professional guidance.
            </p>
          </section>

          <section>
            <h2>Contact Information</h2>
            <p>
              For questions about this medical disclaimer, please visit <a href="/contact" className="text-primary-600 underline">Contact Us</a>.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default DisclaimerPage;
