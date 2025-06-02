import React from "react";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import {
  HelpCircle,
  FileText,
  Shield,
  Award,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

const HelpPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <HelpCircle className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="mt-4 text-lg text-gray-600">
            Learn how to use our service and get the most accurate VA disability
            rating estimate.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <FileText className="h-6 w-6 text-primary-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Document Preparation
                  </h3>
                  <p className="text-gray-600">
                    Gather your medical records, treatment histories, and any
                    documentation of service-connected conditions. Make sure
                    documents are clear and legible.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Shield className="h-6 w-6 text-primary-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Account Creation
                  </h3>
                  <p className="text-gray-600">
                    Sign up for an account to securely upload your documents and
                    receive your rating estimate. Your information is protected
                    with bank-level security.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <Award className="h-6 w-6 text-primary-600 mr-4 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Understanding Your Results
                  </h3>
                  <p className="text-gray-600">
                    Learn how to interpret your disability rating estimate and
                    what steps to take next in your VA claim process.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Common Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    What documents should I upload?
                  </h3>
                  <p className="text-gray-600">
                    Upload medical records that document your service-connected
                    conditions, including:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-gray-600">
                    <li>Military medical records</li>
                    <li>VA treatment records</li>
                    <li>Private medical records</li>
                    <li>Disability Benefits Questionnaires (DBQs)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    How long does processing take?
                  </h3>
                  <p className="text-gray-600">
                    Most documents are analyzed within minutes. Complex cases
                    may take up to an hour for thorough analysis.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    What if I need more help?
                  </h3>
                  <p className="text-gray-600">
                    Our support team is available to assist you. You can:
                  </p>
                  <ul className="list-disc list-inside mt-2 text-gray-600">
                    <li>
                      Visit our{" "}
                      <Link
                        to="/faq"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        FAQ page
                      </Link>
                    </li>
                    <li>
                      Contact us through our{" "}
                      <Link
                        to="/contact"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        support form
                      </Link>
                    </li>
                    <li>Call our support line during business hours</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <a
                  href="https://www.va.gov/disability/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700"
                >
                  VA Disability Benefits{" "}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
                <a
                  href="https://www.va.gov/find-forms/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700"
                >
                  VA Forms <ExternalLink className="h-4 w-4 ml-1" />
                </a>
                <a
                  href="https://www.va.gov/disability/about-disability-ratings/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-primary-600 hover:text-primary-700"
                >
                  About VA Disability Ratings{" "}
                  <ExternalLink className="h-4 w-4 ml-1" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export default HelpPage;
