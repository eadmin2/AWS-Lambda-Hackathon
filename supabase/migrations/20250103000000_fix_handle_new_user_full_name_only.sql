-- Update the handle_new_user function to include full_name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    'veteran'
  );
  
  -- Also create a default payments record with free credits
  INSERT INTO public.payments (user_id, subscription_status, upload_credits)
  VALUES (NEW.id, 'free_tier', 3);
  
  RETURN NEW;
END;
$$; 