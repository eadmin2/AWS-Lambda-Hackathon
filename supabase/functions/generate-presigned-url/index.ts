// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const REGION = "us-east-2";
const BUCKET = "my-receipts-app-bucket";
const ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;

// Supabase client for token validation
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req.headers.get("origin"));
  }
  
  try {
    const { userId, fileName, fileType, estimatedTokens } = await req.json();
    
    if (!userId || !fileName || !fileType) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
      });
    }

    // Default to 1 token if not provided
    const tokensRequired = estimatedTokens || 1;

    // Validate token balance before generating presigned URL
    console.log(`Validating ${tokensRequired} tokens for user ${userId}`);
    
    const { data: tokenBalance, error: balanceError } = await supabase
      .rpc("get_user_token_balance", {
        p_user_id: userId,
      });

    if (balanceError) {
      console.error("Error checking token balance:", balanceError);
      return new Response(JSON.stringify({ 
        error: "Failed to validate token balance" 
      }), {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
      });
    }

    const currentBalance = tokenBalance || 0;
    
    if (currentBalance < tokensRequired) {
      console.log(`Insufficient tokens: need ${tokensRequired}, have ${currentBalance}`);
      return new Response(JSON.stringify({ 
        error: `Insufficient tokens. You need ${tokensRequired} tokens but only have ${currentBalance}. Please purchase more tokens to continue.`,
        tokenBalance: currentBalance,
        tokensRequired: tokensRequired
      }), {
        status: 402, // Payment Required
        headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
      });
    }

    // Generate presigned URL
    const key = `${userId}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });
    
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 min
    
    console.log(`Generated presigned URL for ${fileName}, tokens validated: ${tokensRequired}`);
    
    return new Response(JSON.stringify({ 
      url, 
      key,
      tokenBalance: currentBalance,
      tokensRequired: tokensRequired
    }), {
      headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
    });
    
  } catch (e) {
    console.error("Error in generate-presigned-url:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" },
    });
  }
});
