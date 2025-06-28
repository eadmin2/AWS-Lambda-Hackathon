import React, { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { FileText, Star } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import { LazyMotion, domAnimation, m } from "framer-motion";

// Lazy load non-critical sections
const FeaturesSection = lazy(() => import("./sections/FeaturesSection"));
const BenefitsSection = lazy(() => import("./sections/BenefitsSection"));

// Pre-define animations for reuse
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 }
};

const VeteranRibbon: React.FC = () => (
  <div className="w-full bg-gradient-to-r from-red-600 via-white to-blue-600 py-1.5 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-white to-blue-600 opacity-75"></div>
    <div className="container mx-auto px-4 flex items-center justify-center space-x-2">
      <Star className="h-3 w-3 text-red-600" />
      <span className="text-xs font-semibold text-gray-900">
        Veteran Owned & Operated
      </span>
      <Star className="h-3 w-3 text-blue-600" />
    </div>
  </div>
);

const HomePage: React.FC = () => {
  return (
    <PageLayout>
      <VeteranRibbon />
      {/* Hero section */}
      <section className="bg-[#0a2a66] text-white py-16 md:py-24 min-h-[480px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center md:items-stretch relative">
          {/* Left: Bolt.new badge */}
          <div className="flex-shrink-0 flex justify-center md:justify-start items-center md:items-start w-full md:w-auto mb-8 md:mb-0 md:mr-8 mt-0 md:mt-[-2.5rem] ml-0 md:ml-[-2.5rem]">
            <a
              href="https://bolt.new/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Powered by Bolt.new"
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center"
            >
              <img
                src="/white_circle_360x360.png"
                alt="Powered by Bolt.new"
                className="w-full h-full object-contain"
                width={112}
                height={112}
                fetchpriority="high"
                decoding="async"
              />
            </a>
          </div>
          {/* Right: Main content grid */}
          <div className="flex-1">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <LazyMotion features={domAnimation} strict>
                <m.div {...fadeInUp} className="md:ml-[clamp(56px,16vw,104px)] ml-0 text-center md:text-left flex flex-col items-center md:items-start">
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
                    Simplify Your VA Disability Claim Process!
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-200 mb-8">
                    Upload your medical documents and get an estimated VA disability
                    rating in minutes using advanced AI.
                  </p>
                  <div className="flex flex-col xl:flex-row space-y-3 xl:space-y-0 xl:space-x-4 w-full md:w-auto items-center md:items-start">
                    <a href="/pricing#pricing-section" className="w-full xl:w-auto">
                      <Button size="lg" className="w-full xl:w-auto">
                        View Pricing
                      </Button>
                    </a>
                    <a href="#how-it-works" className="w-full xl:w-auto">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full xl:w-auto"
                      >
                        How It Works
                      </Button>
                    </a>
                    <Link to="/calculator" className="w-full xl:w-auto">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full xl:w-auto text-primary-900"
                      >
                        Try the 2025 VA Disability Calculator
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Trust Message Box */}
                  <m.div
                    {...fadeIn}
                    className="mt-8 p-4 rounded-lg bg-blue-800/30 backdrop-blur-sm border border-blue-700/30 w-full md:w-auto"
                  >
                    <div className="flex items-start space-x-3 justify-center md:justify-start">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-blue-600 flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white mb-1">
                          Built by Veterans, for Veterans
                        </h2>
                        <p className="text-gray-200">
                          We understand your journey because we've walked it too
                        </p>
                      </div>
                    </div>
                  </m.div>
                </m.div>
              </LazyMotion>
              
              <LazyMotion features={domAnimation} strict>
                <m.div
                  {...fadeIn}
                  className="w-full flex justify-center"
                >
                  <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md">
                    <div className="bg-gray-200 p-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <FileText className="h-6 w-6 text-primary-600 mr-2" />
                        <h2 className="text-lg font-semibold text-gray-900">
                          VA Rating Estimate
                        </h2>
                      </div>
                    </div>
                    <div className="p-6 bg-white">
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              PTSD
                            </span>
                            <span className="text-sm font-semibold text-primary-700">
                              70%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: "70%" }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Tinnitus
                            </span>
                            <span className="text-sm font-semibold text-primary-700">
                              10%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: "10%" }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Knee Injury
                            </span>
                            <span className="text-sm font-semibold text-primary-700">
                              30%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full"
                              style={{ width: "30%" }}
                            ></div>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-medium text-gray-900">
                              Combined Rating
                            </span>
                            <span className="text-xl font-bold text-primary-700">
                              80%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </m.div>
              </LazyMotion>
            </div>
          </div>
        </div>
      </section>

      {/* Lazy load non-critical sections */}
      <Suspense fallback={<div className="h-32" />}>
        <FeaturesSection />
      </Suspense>
      <Suspense fallback={<div className="h-32" />}>
        <BenefitsSection />
      </Suspense>

      {/* Key Privacy Features Section */}
      <section className="py-16 bg-primary-900 text-white" id="privacy-features">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto bg-primary-700 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true" focusable="false" role="img"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354l7.071 2.357A2 2 0 0121 8.59v3.6c0 5.523-3.807 10.74-9 12-5.193-1.26-9-6.477-9-12V8.59a2 2 0 011.929-1.879L12 4.354z" /></svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Key Privacy Features</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">Your medical privacy and security are our top priorities—powered by Amazon Bedrock's industry-leading safeguards.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">No Data Retention or AI Training</h3>
              <p className="text-blue-100">Your information is never stored or used to train any AI models—not even by third-party providers like Anthropic. Every query is processed securely and then deleted.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v4m0 0l-2-2m2 2l2-2m-6-6V6a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">No Sharing with Model Providers</h3>
              <p className="text-blue-100">Your data stays private. It is never shared with Anthropic or any other external AI companies.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.657 1.343-3 3-3s3 1.343 3 3-1.343 3-3 3-3-1.343-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 11V7a5 5 0 00-10 0v4" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 19h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">End-to-End Encryption</h3>
              <p className="text-blue-100">All your data is encrypted in transit and at rest.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12v-2a4 4 0 10-8 0v2" /><path strokeLinecap="round" strokeLinejoin="round" d="M20 12v-2a4 4 0 10-8 0v2" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">Strict Compliance Standards</h3>
              <p className="text-blue-100">Amazon Bedrock meets SOC 2, ISO 27001, GDPR, and is HIPAA eligible. We also follow strict data residency requirements.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">Dedicated AWS Model Network</h3>
              <p className="text-blue-100">All AI processing happens within isolated AWS environments. No one—not even AWS or third parties—can access your inputs or results.</p>
            </div>
            <div className="text-center p-6 rounded-lg border border-blue-800 bg-primary-800/80 shadow-sm">
              <div className="w-14 h-14 mx-auto bg-blue-900 rounded-full flex items-center justify-center mb-3">
                <svg className="h-7 w-7 text-blue-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-white">We Never Sell or Share Your Data</h3>
              <p className="text-blue-100">At VARatingAssistant.com, your personal information is never sold, released, or shared. Your trust is our promise.</p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <span className="inline-block px-6 py-3 rounded-full bg-blue-800 text-lg font-semibold text-white shadow-md">Your privacy is our mission.</span>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 bg-primary-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-xl text-gray-200 mb-8">
              Choose a plan and get your estimated VA disability rating in
              minutes.
            </p>
            <a href="/pricing#pricing-section">
              <Button size="lg" className="min-w-[200px]">
                View Pricing
              </Button>
            </a>
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default HomePage;
