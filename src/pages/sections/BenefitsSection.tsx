import React from 'react';
import { Star, CheckCircle } from "lucide-react";

const BenefitsSection: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Our Service
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're dedicated to helping veterans navigate the complex VA
            disability claim process.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-red-50 to-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-blue-600 flex items-center justify-center mr-3">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Veteran Experience & Understanding
                </h3>
                <p className="text-gray-600">
                  Built by veterans who understand the VA system firsthand. Our team's personal experience with the claims process ensures we provide the most relevant and helpful service.
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
                  Get results in minutes, not weeks or months. Focus on your
                  health while we handle the paperwork.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Secure & Confidential
                </h3>
                <p className="text-gray-600">
                  Your medical information is protected with bank-level
                  security and encryption. We never share your data.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-start">
              <CheckCircle className="h-6 w-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Better Preparation
                </h3>
                <p className="text-gray-600">
                  Enter the VA claim process prepared and informed with a
                  clear understanding of your potential rating.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection; 