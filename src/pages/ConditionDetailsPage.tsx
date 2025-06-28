import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Search,
} from "lucide-react";
import { supabase, Document, DisabilityEstimate } from "../lib/supabase";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";

interface ConditionEstimate extends DisabilityEstimate {
  cfr_criteria?: string;
  excerpt?: string;
  matched_keywords?: string[];
  severity?: string;
  estimated_rating?: number;
}

const ConditionDetailsPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [estimates, setEstimates] = useState<ConditionEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!documentId) return;
      setLoading(true);
      try {
        // Fetch document details
        const { data: docData, error: docError } = await supabase
          .from("documents")
          .select("*")
          .eq("id", documentId)
          .single();
        if (docError) throw docError;
        setDocument(docData);

        // Fetch disability estimates
        const { data: estData, error: estError } = await supabase
          .from("disability_estimates")
          .select("*")
          .eq("document_id", documentId);
        if (estError) throw estError;
        setEstimates(estData || []);
      } catch (err: any) {
        setError("Failed to load condition details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [documentId]);

  const combinedRating =
    estimates.length > 0 && estimates[0].combined_rating
      ? estimates[0].combined_rating
      : 0;

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-10">Loading...</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </PageLayout>
    );
  }

  if (!document) {
    return (
      <PageLayout>
        <div className="text-center py-10">Document not found.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Detected Conditions Report
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            Analysis of: {document.file_name}
          </p>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Combined Rating</p>
              <p className="text-6xl font-bold text-primary-600">
                {combinedRating}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Total Conditions Found</p>
              <p className="text-6xl font-bold text-primary-600">
                {estimates.length}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Conditions List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">
            Detailed Breakdown
          </h2>
          {estimates.length > 0 ? (
            estimates.map((estimate) => (
              <Card key={estimate.id} className="bg-white shadow-md">
                <CardHeader className="flex flex-row justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    {estimate.condition}
                  </CardTitle>
                  <span className="text-2xl font-bold text-primary-700 bg-primary-100 px-3 py-1 rounded-md">
                    {estimate.estimated_rating}%
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {estimate.excerpt && (
                      <div>
                        <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                          <Search className="w-4 h-4 mr-2" /> Evidence
                        </h4>
                        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600">
                          "{estimate.excerpt}"
                        </blockquote>
                      </div>
                    )}
                    {estimate.cfr_criteria && (
                      <div>
                        <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                          <BookOpen className="w-4 h-4 mr-2" /> CFR Criteria
                        </h4>
                        <p className="text-gray-600">{estimate.cfr_criteria}</p>
                      </div>
                    )}

                    {estimate.matched_keywords &&
                      estimate.matched_keywords.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-700 flex items-center mb-1">
                            <CheckCircle className="w-4 h-4 mr-2" /> Matched Keywords
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {estimate.matched_keywords.map((kw, i) => (
                              <span
                                key={i}
                                className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto" />
              <p className="mt-4 text-gray-600">
                No conditions were detected in this document.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default ConditionDetailsPage; 