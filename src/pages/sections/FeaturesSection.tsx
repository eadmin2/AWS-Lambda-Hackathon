import React from 'react';
import { FileText, Shield, Award } from "lucide-react";

const FeaturesSection: React.FC = () => {
  return (
    <section className="py-16 bg-white" id="how-it-works">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI-powered platform makes it easy to understand your potential
            VA disability rating.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Upload Documents</h3>
            <p className="text-gray-600">
              Securely upload your medical records, treatment history, and
              service documents.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
            <p className="text-gray-600">
              Our AI extracts medical conditions and matches them to VA
              disability criteria.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border border-gray-100 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Your Rating</h3>
            <p className="text-gray-600">
              Receive an estimated VA disability rating and breakdown of
              conditions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 