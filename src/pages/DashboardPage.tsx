import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle, FileText, Medal } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Header from "../components/layout/Header";
import SummaryCard from "../components/ui/SummaryCard";
import ConditionItem from "../components/ui/ConditionItem";
import CombinedRatingChart from "../components/ui/CombinedRatingChart";
import { useAuth } from "../contexts/AuthContext";
import { getUserDisabilityEstimates, getUserDocuments, DisabilityEstimate } from "../lib/supabase";

// Helper function to calculate VA combined rating
function calculateCombinedRating(ratings: number[]): number {
  if (!ratings.length) return 0;
  
  // Sort ratings in descending order
  const sortedRatings = [...ratings].sort((a, b) => b - a);
  
  let combinedRating = sortedRatings[0];
  
  for (let i = 1; i < sortedRatings.length; i++) {
    const currentRating = sortedRatings[i];
    const remainingEfficiency = (100 - combinedRating) / 100;
    const additionalRating = currentRating * remainingEfficiency;
    combinedRating += additionalRating;
  }
  
  // Round to nearest 10
  return Math.round(combinedRating / 10) * 10;
}

interface DashboardData {
  veteranName: string;
  uploadDate: string;
  combinedRating: number;
  documentsScanned: number;
  conditionsFound: number;
  conditions: {
    name: string;
    rating: number;
    excerpt: string;
    cfrCriteria: string;
    matchedKeywords: string[];
  }[];
  chartData: {
    name: string;
    value: number;
    color: string;
  }[];
}

const DashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        // Fetch disability estimates and documents
        const [estimates, documents] = await Promise.all([
          getUserDisabilityEstimates(user.id),
          getUserDocuments(user.id)
        ]);

        // Calculate combined rating using VA math
        const ratings = estimates.map(est => est.estimated_rating);
        const combinedRating = calculateCombinedRating(ratings);

        // Generate chart colors
        const colors = ['#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];

        // Transform estimates into conditions format
        const conditions = estimates.map((est, index) => ({
          name: est.condition,
          rating: est.estimated_rating,
          excerpt: est.excerpt || 'No excerpt available...',
          cfrCriteria: est.cfr_criteria || '§4.130 Schedule of ratings...',
          matchedKeywords: est.matched_keywords || []
        }));

        // Create chart data
        const chartData = estimates.map((est, index) => ({
          name: est.condition,
          value: est.estimated_rating,
          color: colors[index % colors.length]
        }));

        setData({
          veteranName: user.user_metadata?.full_name || 'Veteran',
          uploadDate: documents[0]?.uploaded_at || new Date().toISOString(),
          combinedRating,
          documentsScanned: documents.length,
          conditionsFound: estimates.length,
          conditions,
          chartData
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (!isAuthLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading || !data) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <Header
          veteranName={data.veteranName}
          uploadDate={data.uploadDate}
          combinedRating={data.combinedRating}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={<FileText />} title="Documents Scanned" value={data.documentsScanned} />
          <SummaryCard icon={<CheckCircle />} title="Conditions Found" value={data.conditionsFound} />
          <SummaryCard icon={<Medal />} title="Combined Rating" value={`${data.combinedRating}%`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <section className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Condition List</h2>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {data.conditions.map((cond) => (
                <ConditionItem
                  key={cond.name}
                  name={cond.name}
                  rating={cond.rating}
                  excerpt={cond.excerpt}
                  cfrCriteria={cond.cfrCriteria}
                  matchedKeywords={cond.matchedKeywords}
                />
              ))}
            </div>
          </section>
          <section>
            <CombinedRatingChart data={data.chartData} />
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;
