-- supabase/migrations/20250628000002_fix_function_search_paths_simple.sql
-- Simple migration to fix function search paths without complex DO blocks

-- == Step 1: Drop RLS policies ==
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
-- Skip admin_users_view since it doesn't exist

-- Drop policies that depend on can_upload_document and other functions
DROP POLICY IF EXISTS "Enable all operations for users on their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents if they can upload" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on user_id" ON public.documents;

-- Drop any other policies that might use our functions
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.profiles;

-- Drop policies on other tables that might use these functions
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own conditions" ON public.user_conditions;
DROP POLICY IF EXISTS "Users can insert their own conditions" ON public.user_conditions;
DROP POLICY IF EXISTS "Users can update their own conditions" ON public.user_conditions;

-- == Step 2: Drop all triggers that use functions we need to update ==
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
DROP TRIGGER IF EXISTS update_document_summaries_updated_at ON public.document_summaries;
DROP TRIGGER IF EXISTS update_chatbot_config_updated_at ON public.chatbot_config;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
DROP TRIGGER IF EXISTS update_user_conditions_updated_at ON public.user_conditions;
DROP TRIGGER IF EXISTS update_document_chunks_updated_at ON public.document_chunks;
DROP TRIGGER IF EXISTS update_stripe_orders_updated_at ON public.stripe_orders;

-- Drop the sync_role_to_user_metadata trigger
DROP TRIGGER IF EXISTS trigger_sync_role_to_user_metadata ON public.profiles;
DROP TRIGGER IF EXISTS sync_role_to_user_metadata ON public.profiles;

-- == Step 3: Drop all functions ==
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.sync_role_to_user_metadata();
DROP FUNCTION IF EXISTS public.search_similar_content(vector, float, int);
DROP FUNCTION IF EXISTS public.monthly_user_signups();
DROP FUNCTION IF EXISTS public.monthly_document_uploads();
DROP FUNCTION IF EXISTS public.monthly_revenue();
DROP FUNCTION IF EXISTS public.active_inactive_users();
DROP FUNCTION IF EXISTS public.increment_upload_credits(uuid, int);
DROP FUNCTION IF EXISTS public.create_admin_user(text, text);
DROP FUNCTION IF EXISTS public.can_upload_document(uuid);
DROP FUNCTION IF EXISTS public.update_user_payment_status(uuid, text);
DROP FUNCTION IF EXISTS public.user_can_upload(uuid);
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

-- Drop check_subscription_status with exact signature to avoid parameter name conflicts
DROP FUNCTION IF EXISTS public.check_subscription_status(uuid);
DROP FUNCTION IF EXISTS public.check_subscription_status(user_id uuid);
DROP FUNCTION IF EXISTS public.check_subscription_status(p_user_id uuid);

-- Drop get_user_role function as well
DROP FUNCTION IF EXISTS public.get_user_role();

-- == Step 4: Recreate all functions with secure search_path ==

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(user_role, 'user');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.check_subscription_status(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.payments
    WHERE payments.user_id = p_user_id AND (
      subscription_status = 'active' OR
      (subscription_end_date > now() AND subscription_status = 'trialing') OR
      upload_credits > 0
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_role_to_user_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_similar_content(query_embedding vector(1536), match_threshold float, match_count int)
RETURNS TABLE (id bigint, content text, similarity float)
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT chunks.id, chunks.content, 1 - (chunks.embedding <=> query_embedding) as similarity
    FROM public.document_chunks as chunks
    WHERE 1 - (chunks.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.monthly_user_signups() 
RETURNS TABLE(month TEXT, count BIGINT)
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN QUERY 
    SELECT to_char(created_at, 'YYYY-MM'), COUNT(*) 
    FROM auth.users 
    GROUP BY 1 
    ORDER BY 1; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.monthly_document_uploads() 
RETURNS TABLE(month TEXT, count BIGINT)
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN QUERY 
    SELECT to_char(uploaded_at, 'YYYY-MM'), COUNT(*) 
    FROM public.documents 
    GROUP BY 1 
    ORDER BY 1; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.monthly_revenue() 
RETURNS TABLE(month TEXT, total BIGINT)
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN QUERY 
    SELECT to_char(created_at, 'YYYY-MM'), SUM(amount_total) 
    FROM public.stripe_orders 
    WHERE payment_status = 'paid' 
    GROUP BY 1 
    ORDER BY 1; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.active_inactive_users() 
RETURNS TABLE(status TEXT, count BIGINT)
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN QUERY 
    SELECT 
        CASE 
            WHEN last_sign_in_at > (now() - interval '30 days') THEN 'active' 
            ELSE 'inactive' 
        END as status, 
        COUNT(*) 
    FROM auth.users 
    GROUP BY 1; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.increment_upload_credits(p_user_id uuid, p_credits int) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN 
    UPDATE public.payments 
    SET upload_credits = upload_credits + p_credits 
    WHERE user_id = p_user_id; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.create_admin_user(p_email TEXT, p_password TEXT) 
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
    user_id uuid; 
BEGIN 
    -- Create user in auth.users (adjust based on your auth setup)
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO user_id;
    
    -- Create or update profile
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (user_id, p_email, 'admin', now(), now())
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
    
    RETURN user_id; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.can_upload_document(p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN (
        SELECT upload_credits > 0 
        FROM public.payments 
        WHERE user_id = p_user_id
    ) OR (
        SELECT public.check_subscription_status(p_user_id)
    ); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.update_user_payment_status(p_user_id uuid, p_status text) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN 
    UPDATE public.payments 
    SET subscription_status = p_status 
    WHERE user_id = p_user_id; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.user_can_upload(p_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN public.can_upload_document(p_user_id); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid) 
RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
    RETURN jsonb_build_object(
        'can_upload', public.can_upload_document(p_user_id), 
        'is_admin', (
            SELECT role = 'admin' 
            FROM public.profiles 
            WHERE id = p_user_id
        )
    ); 
END; 
$$;

-- == Step 5: Recreate triggers ==
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_summaries_updated_at
    BEFORE UPDATE ON public.document_summaries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chatbot_config_updated_at
    BEFORE UPDATE ON public.chatbot_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate the sync_role_to_user_metadata trigger
CREATE TRIGGER trigger_sync_role_to_user_metadata
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_role_to_user_metadata();

-- Uncomment and adjust these if you have these tables and they had the trigger:
-- CREATE TRIGGER update_payments_updated_at
--     BEFORE UPDATE ON public.payments
--     FOR EACH ROW
--     EXECUTE FUNCTION public.update_updated_at_column();

-- CREATE TRIGGER update_user_conditions_updated_at
--     BEFORE UPDATE ON public.user_conditions
--     FOR EACH ROW
--     EXECUTE FUNCTION public.update_updated_at_column();

-- CREATE TRIGGER update_document_chunks_updated_at
--     BEFORE UPDATE ON public.document_chunks
--     FOR EACH ROW
--     EXECUTE FUNCTION public.update_updated_at_column();

-- == Step 6: Recreate RLS policies ==
CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT
TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete their own documents" ON public.documents FOR DELETE
TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE
TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
TO authenticated USING (public.is_admin());

-- Recreate the main document policies
CREATE POLICY "Enable all operations for users on their own documents" ON public.documents
FOR ALL TO authenticated 
USING (user_id = auth.uid() AND public.can_upload_document(auth.uid()));

CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT
TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert documents if they can upload" ON public.documents FOR INSERT
TO authenticated WITH CHECK (user_id = auth.uid() AND public.can_upload_document(auth.uid()));

CREATE POLICY "Users can update their own documents" ON public.documents FOR UPDATE
TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE
TO authenticated USING (user_id = auth.uid());

-- Recreate profile policies
CREATE POLICY "Users can view their own profiles" ON public.profiles FOR SELECT
TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE
TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert their own profiles" ON public.profiles FOR INSERT
TO authenticated WITH CHECK (id = auth.uid());

-- Uncomment and adjust these based on your actual schema:
-- CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT
-- TO authenticated USING (user_id = auth.uid());

-- CREATE POLICY "Users can view their own conditions" ON public.user_conditions FOR SELECT
-- TO authenticated USING (user_id = auth.uid());

-- Uncomment this if you have the admin_users_view:
-- CREATE POLICY "Allow admins to select all users" ON public.admin_users_view FOR SELECT
-- TO authenticated USING (public.is_admin()); 