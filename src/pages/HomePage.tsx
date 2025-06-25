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
                <m.div {...fadeInUp} className="ml-[clamp(56px,16vw,104px)] sm:ml-0">
                  <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4 text-white">
                    Simplify Your VA Disability Claim Process!
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-200 mb-8">
                    Upload your medical documents and get an estimated VA disability
                    rating in minutes using advanced AI.
                  </p>
                  <div className="flex flex-col xl:flex-row space-y-3 xl:space-y-0 xl:space-x-4">
                    <Link to="/pricing#pricing-section">
                      <Button size="lg" className="w-full xl:w-auto">
                        View Pricing
                      </Button>
                    </Link>
                    <a href="#how-it-works">
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full xl:w-auto"
                      >
                        How It Works
                      </Button>
                    </a>
                    <Link to="/calculator">
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
                    className="mt-8 p-4 rounded-lg bg-blue-800/30 backdrop-blur-sm border border-blue-700/30"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-blue-600 flex items-center justify-center">
                        <Star className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          Built by Veterans, for Veterans
                        </h3>
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
                        <h3 className="text-lg font-semibold text-gray-900">
                          VA Rating Estimate
                        </h3>
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

      {/* CTA section */}
      <section className="py-16 bg-primary-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-xl text-gray-200 mb-8">
              Choose a plan and get your estimated VA disability rating in
              minutes.
            </p>
            <Link to="/pricing#pricing-section">
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
