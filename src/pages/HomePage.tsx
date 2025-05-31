import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, Award, CheckCircle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
  return (
    <PageLayout>
      {/* Hero section */}
      <section className="bg-gradient-to-b from-primary-900 to-primary-800 text-white py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                Simplify Your VA Disability Claim Process
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 mb-8">
                Upload your medical documents and get an estimated VA disability rating in minutes using advanced AI.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/pricing">
                  <Button size="lg" className="w-full sm:w-auto">
                    View Pricing
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    How It Works
                  </Button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="bg-primary-100 p-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-primary-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">VA Rating Estimate</h3>
                  </div>
                </div>
                <div className="p-6 bg-white">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">PTSD</span>
                        <span className="text-sm font-semibold text-primary-700">70%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Tinnitus</span>
                        <span className="text-sm font-semibold text-primary-700">10%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Knee Injury</span>
                        <span className="text-sm font-semibold text-primary-700">30%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-medium text-gray-900">Combined Rating</span>
                        <span className="text-xl font-bold text-primary-700">80%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform makes it easy to understand your potential VA disability rating.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Documents</h3>
              <p className="text-gray-600">
                Securely upload your medical records, treatment history, and service documents.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Our AI extracts medical conditions and matches them to VA disability criteria.
              </p>
            </div>

            <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Award className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Your Rating</h3>
              <p className="text-gray-600">
                Receive an estimated VA disability rating and breakdown of conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Service</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're dedicated to helping veterans navigate the complex VA disability claim process.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Accurate Assessments</h3>
                  <p className="text-gray-600">
                    Our AI system is trained on thousands of VA disability cases and the official VASRD criteria to provide accurate estimates.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Time-Saving</h3>
                  <p className="text-gray-600">
                    Get results in minutes, not weeks or months. Focus on your health while we handle the paperwork.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Secure & Confidential</h3>
                  <p className="text-gray-600">
                    Your medical information is protected with bank-level security and encryption. We never share your data.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start">
                <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">Better Preparation</h3>
                  <p className="text-gray-600">
                    Enter the VA claim process prepared and informed with a clear understanding of your potential rating.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 bg-primary-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-xl text-gray-200 mb-8">
              Choose a plan and get your estimated VA disability rating in minutes.
            </p>
            <Link to="/pricing">
              <Button size="lg" className="min-w-[200px]">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default HomePage;