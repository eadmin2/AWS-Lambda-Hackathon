import { useEffect, useState } from "react";

export type VA2025Payload = {
  combinedTable: number[][];
  baseNoChild: { [rating: number]: number[] };
  baseOneChild: { [rating: number]: number[] };
  flatRates: { 10: number; 20: number };
  addAmounts: {
    [rating: number]: { u18: number; o18: number; spouseAA: number };
  };
};

export function useVA2025Data() {
  const [data, setData] = useState<VA2025Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/va2025.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load VA 2025 data");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
