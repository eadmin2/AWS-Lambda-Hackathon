// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const REGION = "us-east-2";
const BUCKET = "my-receipts-app-bucket";
const ACCESS_KEY_ID = Deno.env.get("AWS_ACCESS_KEY_ID")!;
const SECRET_ACCESS_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY")!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

serve(async (req) => {
  try {
    const { userId, fileName, fileType } = await req.json();
    if (!userId || !fileName || !fileType) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400 });
    }
    const key = `${userId}/${fileName}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 min
    return new Response(JSON.stringify({ url, key }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}); 