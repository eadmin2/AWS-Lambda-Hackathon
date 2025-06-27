import React, { useState, useEffect } from "react";
import PageLayout from "../components/layout/PageLayout";
import { VAFormSearch } from "../components/forms/VAFormSearch";
import { FormDetails } from "../components/forms/FormDetails";
import { searchVAForms } from "../services/vaFormsApi";
import type { VAForm } from "../../types";
import { FileText, Download, Book, Phone, MessageSquare, Calendar, HelpCircle, AlertCircle, X } from "lucide-react";

const commonFormCategories = [
  {
    icon: FileText,
    title: "Benefits & Claims",
    description: "Forms for VA benefits applications and claims processing",
    examples: ["21-526EZ", "21-4138"],
    color: "bg-blue-50 text-blue-700"
  },
  {
    icon: Book,
    title: "Healthcare",
    description: "Medical services and healthcare enrollment forms",
    examples: ["10-10EZ", "10-2850c"],
    color: "bg-green-50 text-green-700"
  },
  {
    icon: FileText,
    title: "Records Request",
    description: "Military records and document request forms",
    examples: ["180", "3288"],
    color: "bg-purple-50 text-purple-700"
  }
];

const VAFormsPage: React.FC = () => {
  const [recentForms, setRecentForms] = useState<VAForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<VAForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmergencyBanner, setShowEmergencyBanner] = useState(true);

  useEffect(() => {
    const loadInitialForms = async () => {
      setIsLoading(true);
      try {
        const results = await searchVAForms('');
        setRecentForms(results.slice(0, 6));
      } catch (err) {
        setError('Failed to load forms. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialForms();
  }, []);

  const handleDownload = (form: VAForm) => {
    window.open(form.attributes.url, '_blank');
  };

  const handleFormSelect = (form: VAForm) => {
    setSelectedForm(form);
    // When a form is selected from search, add it to recent forms if not already present
    if (!recentForms.some(f => f.id === form.id)) {
      setRecentForms(prev => [form, ...prev].slice(0, 6));
    }
  };

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Emergency Banner - Collapsible */}
        {showEmergencyBanner && (
          <div className="bg-primary-100 border-b border-primary-300 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-primary-600 mr-2" />
                  <p className="text-sm text-primary-800">
                    Veterans Crisis Line: <a href="tel:988" className="font-medium underline">988</a> then press 1
                  </p>
                </div>
                <button
                  onClick={() => setShowEmergencyBanner(false)}
                  className="text-primary-600 hover:text-primary-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">VA Forms</h1>
              <p className="mt-2 text-lg text-gray-600">
                Search and download official VA forms. Find the forms you need for benefits, healthcare, and more.
              </p>
            </div>

            {/* Search Component */}
            <div className="mb-8">
              <VAFormSearch onFormSelect={handleFormSelect} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#003875] border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* Popular Forms Section */}
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular Forms</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentForms.map((form) => (
                      <div
                        key={form.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-[#003875] bg-opacity-10 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-[#003875]" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900">
                              Form {form.attributes.form_name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {form.attributes.title}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => handleDownload(form)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-[#003875] bg-[#003875] bg-opacity-10 rounded-md hover:bg-opacity-20 transition-colors"
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </button>
                              <button
                                onClick={() => setSelectedForm(form)}
                                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                        {form.attributes.benefit_categories.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1">
                              {form.attributes.benefit_categories.slice(0, 2).map((category, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {category.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Categories Section */}
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Categories</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {commonFormCategories.map((category) => (
                      <div
                        key={category.title}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center`}>
                              <category.icon className="w-6 h-6" />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{category.title}</h3>
                            <p className="text-sm text-gray-500">{category.description}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {category.examples.map((form) => (
                            <div key={form} className="flex items-center text-sm text-gray-600">
                              <FileText className="w-4 h-4 mr-2 text-gray-400" />
                              Form {form}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Help Section */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Need Assistance?</h3>
                      <div className="space-y-4">
                        <a href="tel:988" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <Phone className="w-5 h-5 mr-2" />
                          Call Veterans Crisis Line: 988
                        </a>
                        <a href="tel:1-800-827-1000" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <Phone className="w-5 h-5 mr-2" />
                          VA Benefits Hotline: 1-800-827-1000
                        </a>
                        <a href="#" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <MessageSquare className="w-5 h-5 mr-2" />
                          Chat with a Representative
                        </a>
                        <a href="#" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <Calendar className="w-5 h-5 mr-2" />
                          Schedule an Appointment
                        </a>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Resources</h3>
                      <div className="space-y-4">
                        <a href="https://www.va.gov/resources/how-to-fill-out-va-forms/" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <Book className="w-5 h-5 mr-2" />
                          Form Filing Guide
                        </a>
                        <a href="https://www.va.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <Book className="w-5 h-5 mr-2" />
                          VA.gov Online Services
                        </a>
                        <a href="/faq" className="flex items-center text-[#003875] hover:text-[#002855] transition-colors">
                          <HelpCircle className="w-5 h-5 mr-2" />
                          FAQ
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {/* Form Details Modal */}
        {selectedForm && (
          <FormDetails
            form={selectedForm}
            onClose={() => setSelectedForm(null)}
          />
        )}
      </div>
    </PageLayout>
  );
};

export default VAFormsPage; 