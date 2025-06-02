import axios from "axios";

// Types for Picaos API
export type PicaosCondition = {
  name: string;
  va_term: string;
  icd_code?: string;
  notes?: string;
};

export type PicaosEstimatedRating = {
  condition: string;
  estimated_rating: number;
};

export type PicaosAnalysisResult = {
  conditions: PicaosCondition[];
  estimated_ratings: PicaosEstimatedRating[];
  combined_rating: number;
  raw_text: string;
};

export type PicaosRequest = {
  file_url: string;
  file_base64?: string;
  user_id?: string;
};

// Function to analyze a medical document using Picaos AI
export async function analyzeMedicalDocument(
  fileUrl: string,
  userId?: string,
): Promise<PicaosAnalysisResult> {
  // Replace with your actual Picaos API endpoint and API key
  const picaosApiUrl = import.meta.env.VITE_PICAOS_API_URL;
  const picaosApiKey = import.meta.env.VITE_PICAOS_API_KEY;

  if (!picaosApiUrl || !picaosApiKey) {
    throw new Error("Missing Picaos API environment variables");
  }

  try {
    const response = await axios.post(
      picaosApiUrl,
      {
        file_url: fileUrl,
        user_id: userId,
      } as PicaosRequest,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${picaosApiKey}`,
        },
      },
    );

    return response.data as PicaosAnalysisResult;
  } catch (error) {
    console.error("Error analyzing document with Picaos:", error);
    throw new Error("Failed to analyze document. Please try again later.");
  }
}

// Helper function to calculate combined VA disability rating
// This is a simplified version of the VA's combined rating table calculation
export function calculateCombinedRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  if (ratings.length === 1) return ratings[0];

  // Sort ratings in descending order
  const sortedRatings = [...ratings].sort((a, b) => b - a);

  // Calculate combined rating
  let combinedValue = sortedRatings[0];

  for (let i = 1; i < sortedRatings.length; i++) {
    const rating = sortedRatings[i];
    const remainingCapacity = 100 - combinedValue;
    const additionalValue = (remainingCapacity * rating) / 100;
    combinedValue += additionalValue;
  }

  // Round to nearest 10
  return Math.round(combinedValue / 10) * 10;
}
