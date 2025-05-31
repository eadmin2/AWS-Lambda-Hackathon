import React from 'react';
import { CreditCard, Calendar, Shield } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { createUploadCheckoutSession, createSubscriptionCheckoutSession } from '../../lib/stripe';

interface PaymentOptionsProps {
  userId: string;
  onError: (error: string) => void;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({ userId, onError }) => {
  const [isLoading, setIsLoading] = React.useState<'single' | 'subscription' | null>(null);

  const handleSingleUpload = async () => {
    try {
      setIsLoading('single');
      await createUploadCheckoutSession(userId);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      onError('Failed to process payment. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSubscription = async () => {
    try {
      setIsLoading('subscription');
      await createSubscriptionCheckoutSession(userId);
    } catch (error) {
      console.error('Error creating subscription:', error);
      onError('Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-primary-500" />
            Single Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold">$29</span>
            <span className="text-gray-500 ml-1">per document</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Upload and analyze 1 medical document</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">AI-powered condition identification</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">VA disability rating estimate</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Access to results for 30 days</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSingleUpload}
            isLoading={isLoading === 'single'}
          >
            Purchase Single Upload
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary-500" />
            Monthly Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold">$49</span>
            <span className="text-gray-500 ml-1">per month</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">
                <strong>Unlimited</strong> document uploads
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">AI-powered condition identification</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">VA disability rating estimate</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Priority processing</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Download detailed PDF reports</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-sm">Cancel anytime</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleSubscription}
            isLoading={isLoading === 'subscription'}
          >
            Start Monthly Subscription
          </Button>
        </CardFooter>
      </Card>

      <div className="md:col-span-2">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start">
          <Shield className="h-5 w-5 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900">Secure Payment Processing</h4>
            <p className="mt-1 text-xs text-gray-500">
              Your payment information is securely processed by Stripe. We never store your credit card details.
              For subscription plans, you can cancel at any time from your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptions;