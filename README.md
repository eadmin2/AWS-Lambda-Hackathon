# VA Disability Rating Assistant

A secure web application to help U.S. veterans upload their medical documents and receive an estimate of their VA disability rating.

## Features

- Secure authentication with Supabase Auth
- Document upload system with Supabase Storage
- AI-powered medical document analysis using Picaos
- Interactive dashboard showing document history and disability rating estimates
- Stripe payment integration with subscription/pay-per-upload options
- Responsive design optimized for all devices

## Tech Stack

- React with TypeScript
- Tailwind CSS for styling
- Supabase for authentication, database, and storage
- Stripe for payment processing
- Picaos for AI medical document processing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account
- Stripe account
- Picaos API access

### Environment Variables

#### Frontend Environment Variables (.env)

Create a `.env` file in the root directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_STRIPE_SINGLE_UPLOAD_PRICE_ID=your_stripe_price_id
VITE_STRIPE_SUBSCRIPTION_PRICE_ID=your_stripe_subscription_price_id
VITE_PICAOS_API_URL=your_picaos_api_url
VITE_PICAOS_API_KEY=your_picaos_api_key
```

#### Supabase Edge Functions Environment Variables

In your Supabase project dashboard, navigate to Edge Functions > Environment Variables and add:

```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_SINGLE_UPLOAD_PRICE_ID=your_stripe_single_upload_price_id
STRIPE_SUBSCRIPTION_PRICE_ID=your_stripe_subscription_price_id
```

### Installation

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`

## Supabase Setup

The application uses the following Supabase tables:

- profiles
- documents
- disability_estimates

See the schema in the project documentation for details.

## Deployment

Build the project for production:

```
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.