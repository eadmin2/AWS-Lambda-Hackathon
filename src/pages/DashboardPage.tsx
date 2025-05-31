import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Upload, AlertCircle } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import FileUploader from '../components/documents/FileUploader';
import DocumentsList from '../components/documents/DocumentsList';
import PaymentOptions from '../components/payment/PaymentOptions';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  getUserDocuments, 
  getUserDisabilityEstimates, 
  Document, 
  DisabilityEstimate 
} from '../lib/supabase';
import { 
  checkUserSubscription, 
  checkUserUploadCredits 
} from '../lib/stripe';

const DashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('checkout');
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [estimates, setEstimates] = useState<Record<string, DisabilityEstimate[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [uploadCredits, setUploadCredits] = useState(0);
  const [canUpload, setCanUpload] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user documents
        const docs = await getUserDocuments(user.id);
        setDocuments(docs);
        
        // Fetch disability estimates for each document
        const estimatesData: Record<string, DisabilityEstimate[]> = {};
        
        const allEstimates = await getUserDisabilityEstimates(user.id);
        
        // Group estimates by document
        docs.forEach(doc => {
          // For this demo, we'll just use the first set of estimates for each document
          // In a real app, you'd have a document_id field in the disability_estimates table
          const docEstimates = allEstimates.filter(
            (est, index, self) => 
              self.findIndex(e => e.condition === est.condition) === index
          );
          
          estimatesData[doc.id] = docEstimates;
        });
        
        setEstimates(estimatesData);
        
        // Check subscription status
        const hasActiveSubscription = await checkUserSubscription(user.id);
        setHasSubscription(hasActiveSubscription);
        
        // Check upload credits
        const credits = await checkUserUploadCredits(user.id);
        setUploadCredits(credits);
        
        // Set canUpload based on subscription or credits
        setCanUpload(hasActiveSubscription || credits > 0);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load your data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);

  const handleUploadComplete = async (documentId: string) => {
    if (!user) return;
    
    try {
      // Refresh documents list
      const docs = await getUserDocuments(user.id);
      setDocuments(docs);
      
      // If user doesn't have a subscription, decrement their upload credits
      if (!hasSubscription) {
        setUploadCredits(prev => Math.max(0, prev - 1));
        if (uploadCredits <= 1) {
          setCanUpload(false);
        }
      }
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Redirect if not authenticated
  if (!isAuthLoading && !user) {
    return <Navigate to="/auth\" replace />;
  }

  return (
    <PageLayout>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {checkoutStatus === 'success' && (
              <div className="mb-6 bg-success-100 border border-success-200 p-4 rounded-md flex items-start">
                <CheckCircle className="h-5 w-5 text-success-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-success-700 text-sm font-medium">Payment successful!</p>
                  <p className="text-success-600 text-xs mt-1">
                    You can now upload and analyze your medical documents.
                  </p>
                </div>
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Dashboard</h1>
            
            {error && (
              <div className="mb-6 bg-error-100 border border-error-200 p-4 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-error-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Upload Medical Document</CardTitle>
                </CardHeader>
                <CardContent>
                  {!canUpload ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4 flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-700 text-sm font-medium">Payment Required</p>
                        <p className="text-amber-600 text-xs mt-1">
                          You need to purchase a subscription or single upload credit before you can upload documents.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 flex items-start">
                      <Upload className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-green-700 text-sm font-medium">
                          {hasSubscription 
                            ? 'You have an active subscription' 
                            : `You have ${uploadCredits} upload credit${uploadCredits !== 1 ? 's' : ''} remaining`}
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          Upload your medical documents to get an estimated VA disability rating.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <FileUploader
                    userId={user?.id || ''}
                    onUploadComplete={handleUploadComplete}
                    onUploadError={handleUploadError}
                    canUpload={canUpload}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Subscription Status</h3>
                      <p className="text-lg font-semibold">
                        {hasSubscription ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-600">Inactive</span>
                        )}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Upload Credits</h3>
                      <p className="text-lg font-semibold">
                        {hasSubscription ? (
                          <span className="text-green-600">Unlimited</span>
                        ) : (
                          <span className={uploadCredits > 0 ? 'text-green-600' : 'text-gray-600'}>
                            {uploadCredits}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {!hasSubscription && uploadCredits === 0 && (
                      <div className="pt-4">
                        <a href="#payment-options" className="btn btn-primary text-sm w-full">
                          Purchase Access
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Documents</h2>
              <DocumentsList
                documents={documents}
                estimates={estimates}
                isLoading={isLoading}
              />
            </div>
            
            {!hasSubscription && (
              <div id="payment-options" className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Options</h2>
                <PaymentOptions
                  userId={user?.id || ''}
                  onError={handleUploadError}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;