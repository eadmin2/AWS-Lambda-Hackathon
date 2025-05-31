/*
  # Add payments table and Stripe integration

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `stripe_customer_id` (text)
      - `subscription_status` (text)
      - `subscription_end_date` (timestamptz)
      - `upload_credits` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on payments table
    - Add policies for users to view their own payments
    - Add policies for admins to view all payments
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  subscription_status text,
  subscription_end_date timestamptz,
  upload_credits integer DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.check_subscription_status(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM payments
    WHERE payments.user_id = user_id
    AND (
      subscription_status = 'active' OR
      (subscription_end_date > now() AND subscription_status = 'trialing') OR
      upload_credits > 0
    )
  );
END;
$$;