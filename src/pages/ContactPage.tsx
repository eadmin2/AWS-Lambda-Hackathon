import React, { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Mail, Phone, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import axios from "axios";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Email template generator
function generateContactEmailTemplate({ name, email, subject, message }: ContactFormData) {
  return `
    <div style="background:#0a2a66;padding:32px 0;font-family:sans-serif;">
      <table style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(10,42,102,0.08);">
        <tr><td style="background:#0a2a66;padding:24px 0;text-align:center;">
          <img src='https://varatingassistant.com/Logo.png' alt='VA Rating Assistant' style='height:48px;margin-bottom:8px;' />
          <h1 style="color:#fff;font-size:1.5rem;margin:0;">New Contact Form Submission</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="color:#0a2a66;font-size:1.25rem;margin-bottom:16px;">${subject}</h2>
          <p style="margin:0 0 16px 0;color:#222;font-size:1rem;"><strong>From:</strong> ${name} (${email})</p>
          <div style="background:#f3f6fa;padding:16px 20px;border-radius:8px;color:#222;font-size:1rem;line-height:1.6;">${message.replace(/\n/g, '<br/>')}</div>
        </td></tr>
        <tr><td style="background:#f3f6fa;padding:16px;text-align:center;color:#0a2a66;font-size:0.95rem;">VA Rating Assistant &mdash; Veteran Owned &amp; Operated</td></tr>
      </table>
    </div>
  `;
}

const ContactPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>();

  const [submitStatus, setSubmitStatus] = useState<null | 'success' | 'error'>(null);

  const onSubmit = async (data: ContactFormData) => {
    try {
      setSubmitStatus(null);
      // Send email via Supabase Edge Function
      await axios.post("https://algojcmqstokyghijcyc.supabase.co/functions/v1/send-contact-email", {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer SUPABASE_ANON_KEY",
        },
      });
      setSubmitStatus('success');
      reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      setSubmitStatus('error');
    }
  };

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <MessageSquare className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-4 text-lg text-gray-600">
            Have questions? We're here to help veterans navigate their
            disability claims.
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-8 rounded-lg bg-green-100 border border-green-400 text-green-700 px-4 py-3 text-center">
            <strong className="font-bold">Message sent!</strong> We'll get back to you as soon as possible.
          </div>
        )}
        {submitStatus === 'error' && (
          <div className="mb-8 rounded-lg bg-red-100 border border-red-400 text-red-700 px-4 py-3 text-center">
            <strong className="font-bold">Error:</strong> There was a problem sending your message. Please try again later.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="mt-1 input"
                  {...register("name", { required: "Name is required" })}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="mt-1 input"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700"
                >
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  className="mt-1 input"
                  {...register("subject", { required: "Subject is required" })}
                />
                {errors.subject && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.subject.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="mt-1 input"
                  {...register("message", { required: "Message is required" })}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-error-500">
                    {errors.message.message}
                  </p>
                )}
              </div>

              <Button type="submit" isLoading={isSubmitting}>
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default ContactPage;
