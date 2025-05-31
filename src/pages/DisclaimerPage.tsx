import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { AlertTriangle } from 'lucide-react';

const DisclaimerPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <AlertTriangle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Medical Disclaimer</h1>
          <p className="mt-4 text-lg text-gray-600">
            Last updated: March 15, 2025
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Not Medical Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                The content and services provided by VA Rating Assistant are for informational purposes only 
                and are not intended to be a substitute for professional medical advice, diagnosis, or treatment. 
                Always seek the advice of your physician or other qualified health provider with any questions 
                you may have regarding a medical condition.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estimates Only</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our disability rating estimates are generated using AI analysis of provided documentation. 
                These estimates are not official VA ratings and should not be considered as guaranteed outcomes 
                of VA disability claims. The Department of Veterans Affairs makes all final determinations 
                regarding disability ratings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Emergency Situations</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Do not use our service for emergency medical situations. If you have a medical emergency, 
                immediately call your doctor or 911. Our service is not intended to provide emergency medical 
                advice or treatment recommendations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Doctor-Patient Relationship</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Using our service does not create a doctor-patient relationship. Our AI analysis and 
                estimates do not constitute medical advice or treatment recommendations. We do not practice 
                medicine or provide medical services through our platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accuracy of Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                While we strive to provide accurate information and estimates, we make no representations or 
                warranties about the accuracy, completeness, or reliability of any content or estimates provided 
                through our service. Medical knowledge and VA rating criteria may change over time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Individual Results May Vary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Every veteran's situation is unique. The estimates and information provided through our service 
                are based on general patterns and historical data. Your actual VA disability rating may differ 
                from our estimates based on various factors considered during the official VA review process.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consult Qualified Professionals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We recommend consulting with qualified medical professionals and VA-accredited representatives 
                for personalized advice regarding your medical conditions and VA disability claims. Our service 
                should be used as a supplementary tool, not a replacement for professional guidance.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                For questions about this medical disclaimer, please contact us at:
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

export default DisclaimerPage;