import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  AlertCircle,
  ClipboardList,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { supabase, Document, DisabilityEstimate } from "../lib/supabase";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../lib/utils";

interface ConditionWithDocument extends DisabilityEstimate {
  document?: Document;
  cfr_criteria?: string;
  excerpt?: string;
  matched_keywords?: string[];
  severity?: string;
}

const ConditionsOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const [conditions, setConditions] = useState<ConditionWithDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConditions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch all disability estimates for the user with document info
        const { data: conditionsData, error: conditionsError } = await supabase
          .from("disability_estimates")
          .select(`
            *,
            documents (
              id,
              file_name,
              uploaded_at
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (conditionsError) throw conditionsError;
        setConditions(conditionsData || []);
      } catch (err: any) {
        setError("Failed to load conditions.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConditions();
  }, [user]);

  // Calculate statistics
  const totalConditions = conditions.length;
  const combinedRating = conditions.length > 0 
    ? Math.max(...conditions.map(c => c.combined_rating || 0))
    : 0;
  const uniqueDocuments = new Set(conditions.map(c => c.document_id)).size;

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-10">Loading conditions...</div>
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

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Detected Conditions
          </h1>
          <p className="text-lg text-gray-600 mt-1">
            Overview of all conditions detected across your documents
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <ClipboardList className="h-12 w-12 text-primary-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-primary-600">{totalConditions}</p>
              <p className="text-gray-600">Total Conditions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-12 w-12 text-primary-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-primary-600">{combinedRating}%</p>
              <p className="text-gray-600">Combined Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-12 w-12 text-primary-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-primary-600">{uniqueDocuments}</p>
              <p className="text-gray-600">Documents Analyzed</p>
            </CardContent>
          </Card>
        </div>

        {/* Conditions List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 border-b pb-2">
            All Detected Conditions
          </h2>
          {conditions.length > 0 ? (
            conditions.map((condition) => (
              <Card key={condition.id} className="bg-white shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {condition.condition}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 space-x-4">
                        <span className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {condition.document?.file_name || 'Unknown Document'}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {condition.document?.uploaded_at 
                            ? formatDate(condition.document.uploaded_at)
                            : 'Unknown Date'
                          }
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary-700 bg-primary-100 px-3 py-1 rounded-md">
                        {condition.disability_rating}%
                      </span>
                    </div>
                  </div>
                  
                  {condition.excerpt && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 italic">
                        "{condition.excerpt.substring(0, 200)}..."
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {condition.matched_keywords && condition.matched_keywords.slice(0, 3).map((keyword, i) => (
                        <span
                          key={i}
                          className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                      {condition.matched_keywords && condition.matched_keywords.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{condition.matched_keywords.length - 3} more
                        </span>
                      )}
                    </div>
                    <Link
                      to={`/documents/${condition.document_id}/report`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Full Report →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Conditions Detected Yet
              </h3>
              <p className="text-gray-600 mb-4">
                Upload and process some medical documents to see detected conditions here.
              </p>
              <Link
                to="/documents"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Upload Documents
              </Link>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default ConditionsOverviewPage; 