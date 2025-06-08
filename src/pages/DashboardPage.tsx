import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { CheckCircle, FileText, Medal } from "lucide-react";
import PageLayout from "../components/layout/PageLayout";
import Header from "../components/layout/Header";
import SummaryCard from "../components/ui/SummaryCard";
import ConditionItem from "../components/ui/ConditionItem";
import CombinedRatingChart from "../components/ui/CombinedRatingChart";
import { useAuth } from "../contexts/AuthContext";

const mockRatings = {
  veteranName: "John Doe",
  uploadDate: "2024-06-01",
  combinedRating: 40,
  documentsScanned: 12,
  conditionsFound: 5,
  conditions: [
    {
      name: "PTSD",
      rating: 30,
      excerpt: "The veteran reports ongoing symptoms of anxiety and nightmares...",
      cfrCriteria: "§4.130 Schedule of ratings—Mental disorders...",
      matchedKeywords: ["anxiety", "nightmares"]
    },
    {
      name: "Tinnitus",
      rating: 10,
      excerpt: "The veteran experiences constant ringing in the ears...",
      cfrCriteria: "§4.87 Schedule of ratings—Ear, other sense organs...",
      matchedKeywords: ["ringing", "ears"]
    }
  ],
  chartData: [
    { name: "PTSD", value: 30, color: "#60a5fa" },
    { name: "Tinnitus", value: 10, color: "#fbbf24" }
  ]
};

// Define types for dashboard data
interface Condition {
  name: string;
  rating: number;
  excerpt: string;
  cfrCriteria: string;
  matchedKeywords: string[];
}

interface ChartDatum {
  name: string;
  value: number;
  color: string;
}

interface RatingsData {
  veteranName: string;
  uploadDate: string;
  combinedRating: number;
  documentsScanned: number;
  conditionsFound: number;
  conditions: Condition[];
  chartData: ChartDatum[];
}

const DashboardPage: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<RatingsData | null>(null);

  useEffect(() => {
    fetch("/api/ratings")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(mockRatings));
  }, []);

  if (!isAuthLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const d: RatingsData = data || mockRatings;

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <Header
          veteranName={d.veteranName}
          uploadDate={d.uploadDate}
          combinedRating={d.combinedRating}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard icon={<FileText />} title="Documents Scanned" value={d.documentsScanned} />
          <SummaryCard icon={<CheckCircle />} title="Conditions Found" value={d.conditionsFound} />
          <SummaryCard icon={<Medal />} title="Combined Rating" value={`${d.combinedRating}%`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <section className="md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Condition List</h2>
            <div className="max-h-[400px] overflow-y-auto pr-2">
              {d.conditions.map((cond: Condition) => (
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
            <CombinedRatingChart data={d.chartData} />
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default DashboardPage;
