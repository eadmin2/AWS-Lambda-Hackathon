import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle, FileText, Medal } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Header from "../components/layout/Header";
import SummaryCard from "../components/ui/SummaryCard";
import ConditionItem from "../components/ui/ConditionItem";
import CombinedRatingChart from "../components/ui/CombinedRatingChart";
import { useAuth } from "../contexts/AuthContext";
import { getUserConditions, getUserDocuments, UserCondition } from "../lib/supabase";

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
  conditions: UserCondition[];
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

  // Handle redirect after Google auth
  useEffect(() => {
    if (user && !isAuthLoading) {
      const pendingRedirect = sessionStorage.getItem("pendingRedirect");
      if (pendingRedirect) {
        // Parse the URL to get the type parameter
        const url = new URL(pendingRedirect);
        const type = url.searchParams.get("type");
        
        // Remove the pending redirect before proceeding
        sessionStorage.removeItem("pendingRedirect");
        
        // If this is a checkout redirect, go through the checkout page
        if (type) {
          window.location.href = `/checkout?type=${type}`;
        } else {
          window.location.href = pendingRedirect;
        }
      }
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
        // If there's no user and auth is done loading, stop loading.
        if (!isAuthLoading) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true); // Start loading now that we have a user
      try {
        // Fetch user conditions and documents
        const [conditionsData, documents] = await Promise.all([
          getUserConditions(user.id),
          getUserDocuments(user.id)
        ]);

        const ratings = conditionsData.map(c => c.rating || 0);
        const combinedRating = calculateCombinedRating(ratings);

        const colors = ['#60a5fa', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'];

        const chartData = conditionsData.map((c, index) => ({
          name: c.name,
          value: c.rating || 0,
          color: colors[index % colors.length]
        }));

        setData({
          veteranName: user.user_metadata?.full_name || 'Veteran',
          uploadDate: documents[0]?.uploaded_at || new Date().toISOString(),
          combinedRating,
          documentsScanned: documents.length,
          conditionsFound: conditionsData.length,
          conditions: conditionsData,
          chartData
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </PageLayout>
    );
  }

  if (!user) {
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

  // After fetching documents and conditions, count status
  const inProgressCount = data ? data.documentsScanned - data.conditionsFound : 0;
  const completeCount = data ? data.conditionsFound : 0;

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        {inProgressCount > 0 && (
          <div className="flex items-center bg-yellow-100 border border-yellow-300 text-yellow-900 px-4 py-3 rounded-md shadow mb-2">
            <svg className="animate-spin h-5 w-5 mr-2 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            <span className="font-semibold">Your document is being processed.</span>
            <span className="ml-2">This usually takes 5-10 minutes. You will receive an email when it's ready.</span>
          </div>
        )}
        <Header
          veteranName={data.veteranName}
          uploadDate={data.uploadDate}
          combinedRating={data.combinedRating}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={<FileText />} title="Documents Scanned" value={data.documentsScanned}>
            <div className="text-xs mt-1 text-gray-600 flex flex-wrap gap-2 items-center">
              {completeCount > 0 && <span>{completeCount} Complete</span>}
              {inProgressCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900 font-semibold animate-pulse">
                  <svg className="animate-spin h-4 w-4 mr-1 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  {inProgressCount} In Progress
                </span>
              )}
            </div>
          </SummaryCard>
          <SummaryCard icon={<CheckCircle />} title="Conditions Found" value={data.conditionsFound} />
          <SummaryCard icon={<Medal />} title="Combined Rating" value={`${data.combinedRating}%`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <section className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Condition List</h2>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {data.conditions.map((condition) => (
                <div key={condition.id}>
                  <ConditionItem
                    condition={condition}
                  />
                </div>
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
