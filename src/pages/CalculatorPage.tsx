import React, { useState } from "react";
import { useVA2025Data } from "../lib/useVA2025Data";
import PageLayout from "../components/layout/PageLayout";
import type { VA2025Payload } from "../lib/useVA2025Data";

// Bilateral factor logic: if there are two or more disabilities affecting paired extremities (arms or legs),
// apply the bilateral factor (combine those first, then add the rest)
function calculateCombinedRatingWithBilateral(
  disabilities: DisabilityEntry[],
): number {
  if (!disabilities.length) return 0;
  // Group by extremity
  const armExtremities = ["leftArm", "rightArm"];
  const legExtremities = ["leftLeg", "rightLeg"];
  const armRatings = disabilities
    .filter((d) => armExtremities.includes(d.extremity))
    .map((d) => d.percent);
  const legRatings = disabilities
    .filter((d) => legExtremities.includes(d.extremity))
    .map((d) => d.percent);
  const otherRatings = disabilities
    .filter(
      (d) =>
        !armExtremities.includes(d.extremity) &&
        !legExtremities.includes(d.extremity),
    )
    .map((d) => d.percent);

  const bilateralRatings: number[] = [];
  // If both arms or both legs have ratings, apply bilateral factor
  if (armRatings.length >= 2) {
    const combinedArms =
      100 * (1 - armRatings.reduce((hp, r) => hp * (1 - r / 100), 1));
    const bilateralArms = combinedArms * 1.1; // add 10%
    bilateralRatings.push(bilateralArms);
  } else if (armRatings.length === 1) {
    bilateralRatings.push(armRatings[0]);
  }
  if (legRatings.length >= 2) {
    const combinedLegs =
      100 * (1 - legRatings.reduce((hp, r) => hp * (1 - r / 100), 1));
    const bilateralLegs = combinedLegs * 1.1; // add 10%
    bilateralRatings.push(bilateralLegs);
  } else if (legRatings.length === 1) {
    bilateralRatings.push(legRatings[0]);
  }
  // Combine bilateral (if any) and other ratings
  const allRatings = [...bilateralRatings, ...otherRatings].filter(
    (r) => r > 0,
  );
  if (!allRatings.length) return 0;
  // Standard VA math: combine sequentially, round to nearest 10
  const sortedRatings = [...allRatings].sort((a, b) => b - a);
  const healthy = sortedRatings.reduce((hp, r) => hp * (1 - r / 100), 1);
  const combinedRaw = 100 * (1 - healthy);
  return Math.min(100, Math.round(combinedRaw / 10) * 10);
}

// New compensation calculation using only scraped data
export function calculateCompensation(
  rating: number,
  hasSpouse: boolean,
  spouseAA: boolean,
  childU18: number,
  childO18: number,
  parentCount: number,
  vaData: VA2025Payload, // Add this parameter
): { total: number; breakdown: string[] } {
  if (!vaData) return { total: 0, breakdown: ["Loading VA data..."] };
  // Use flat rates for 10% and 20%
  if (rating === 10 || rating === 20) {
    return {
      total: vaData.flatRates[rating],
      breakdown: [`Flat rate for ${rating}%`],
    };
  }
  // For 30%+, use the scraped base rates
  const hasKids = childU18 + childO18 > 0;
  const baseTable = hasKids ? vaData.baseOneChild : vaData.baseNoChild;
  // Calculate scenario index based on dependents
  let scenarioIndex = 0;
  if (hasSpouse) {
    scenarioIndex = 1 + parentCount; // spouse + 0-2 parents
  } else {
    scenarioIndex = 0; // veteran alone
  }
  const base =
    baseTable[rating as keyof typeof baseTable]?.[scenarioIndex] || 0;
  // Add extra amounts using scraped data
  const adds = vaData.addAmounts[rating as keyof typeof vaData.addAmounts];
  if (!adds) {
    return { total: base, breakdown: [`Base rate for ${rating}%`] };
  }
  // Calculate additional amounts
  const paidKids = hasKids ? 1 : 0;
  const extraU18 = Math.max(0, childU18 - paidKids) * adds.u18;
  const extraO18 = childO18 * adds.o18;
  const spAA = hasSpouse && spouseAA ? adds.spouseAA : 0;
  const breakdown = [
    `Base: $${base.toFixed(2)}`,
    ...(extraU18
      ? [
          `+ $${extraU18.toFixed(2)} for ${childU18 - paidKids} additional child(ren) under 18`,
        ]
      : []),
    ...(extraO18
      ? [`+ $${extraO18.toFixed(2)} for ${childO18} child(ren) 18-24`]
      : []),
    ...(spAA ? [`+ $${spAA.toFixed(2)} for spouse Aid & Attendance`] : []),
  ];
  return {
    total: +(base + extraU18 + extraO18 + spAA).toFixed(2),
    breakdown,
  };
}

const disabilityPercents = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const extremities = [
  { label: "Left Leg", value: "leftLeg" },
  { label: "Right Leg", value: "rightLeg" },
  { label: "Left Arm", value: "leftArm" },
  { label: "Right Arm", value: "rightArm" },
  { label: "Other", value: "other" },
];

interface DisabilityEntry {
  percent: number;
  extremity: string;
}

const initialDependents = {
  spouse: false,
  spouseAA: false,
  childrenU18: 0,
  children18to24: 0,
  parents: 0,
};

type Dependents = typeof initialDependents;

const CalculatorPage: React.FC = () => {
  const { data } = useVA2025Data();
  const [disabilities, setDisabilities] = useState<DisabilityEntry[]>([]);
  const [selectedExtremity, setSelectedExtremity] = useState<string>("other");
  const [dependents, setDependents] = useState<Dependents>(initialDependents);

  // Add disability
  const addDisability = (percent: number) => {
    setDisabilities([
      ...disabilities,
      { percent, extremity: selectedExtremity },
    ]);
  };
  // Remove disability
  const removeDisability = (idx: number) => {
    setDisabilities(disabilities.filter((_, i) => i !== idx));
  };

  // Calculate combined rating and payment (with bilateral factor)
  const combinedRounded = calculateCombinedRatingWithBilateral(disabilities);
  let payment = 0;
  let paymentBreakdownArr: string[] = [];
  if (data) {
    const result = calculateCompensation(
      combinedRounded,
      dependents.spouse,
      dependents.spouseAA,
      dependents.childrenU18,
      dependents.children18to24,
      dependents.parents,
      data, // Pass the scraped VA data
    );
    payment = result.total;
    paymentBreakdownArr = result.breakdown;
  }
  const paymentBreakdown = paymentBreakdownArr.join(" ");

  return (
    <>
      <PageLayout>
        <div className="max-w-5xl mx-auto py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div>
            <div className="mb-6 p-6 bg-white rounded shadow">
              <h2 className="text-xl font-bold mb-4 text-primary-900">
                1. Enter Your Disability Ratings
              </h2>
              <div className="mb-2 flex flex-wrap gap-2">
                {extremities.map((ext) => (
                  <button
                    key={ext.value}
                    className={`px-3 py-1 rounded border ${selectedExtremity === ext.value ? "bg-primary-700 text-white border-primary-700" : "bg-gray-100 text-gray-700 border-gray-300"} font-medium`}
                    onClick={() => setSelectedExtremity(ext.value)}
                    type="button"
                  >
                    {ext.label}
                  </button>
                ))}
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {disabilityPercents.map((p) => (
                  <button
                    key={p}
                    className="px-3 py-2 rounded bg-primary-50 text-primary-900 border border-primary-200 font-semibold hover:bg-primary-100 focus:outline-none"
                    onClick={() => addDisability(p)}
                    type="button"
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Your Disabilities:</h3>
                {disabilities.length === 0 && (
                  <div className="text-gray-500">No disabilities added yet.</div>
                )}
                <ul className="space-y-2">
                  {disabilities.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2"
                    >
                      <span className="font-mono">{d.percent}%</span>
                      <span className="text-xs text-gray-600">
                        ({extremities.find((e) => e.value === d.extremity)?.label}
                        )
                      </span>
                      <button
                        className="ml-auto text-red-500 hover:underline text-xs"
                        onClick={() => removeDisability(i)}
                        aria-label="Remove disability"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-sm text-blue-900">
                <strong>How VA Math Works</strong>
                <br />
                VA doesn't simply add your disability percentages. Instead, they
                use a combined ratings formula that starts with your highest
                rating and works downward using your remaining capacity. If you
                have disabilities affecting both arms or both legs, a bilateral
                factor is applied (10% extra before combining with other ratings).
              </div>
            </div>
            <div className="p-6 bg-white rounded shadow">
              <h2 className="text-xl font-bold mb-4 text-primary-900">
                2. Add Your Dependents
              </h2>
              <div className="mb-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="spouse"
                  checked={dependents.spouse}
                  onChange={(e) =>
                    setDependents((d) => ({ ...d, spouse: e.target.checked }))
                  }
                />
                <label htmlFor="spouse" className="text-sm">
                  I have a spouse
                </label>
                {dependents.spouse && (
                  <>
                    <input
                      type="checkbox"
                      id="spouseAA"
                      checked={dependents.spouseAA}
                      onChange={(e) =>
                        setDependents((d) => ({
                          ...d,
                          spouseAA: e.target.checked,
                        }))
                      }
                      className="ml-4"
                    />
                    <label htmlFor="spouseAA" className="text-sm">
                      Spouse requires Aid & Attendance
                    </label>
                  </>
                )}
              </div>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Children Under 18
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="border rounded px-3 py-2 w-full"
                    value={dependents.childrenU18}
                    onChange={(e) =>
                      setDependents((d) => ({
                        ...d,
                        childrenU18: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Children 18-24 (in school)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="border rounded px-3 py-2 w-full"
                    value={dependents.children18to24}
                    onChange={(e) =>
                      setDependents((d) => ({
                        ...d,
                        children18to24: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Dependent Parents
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={2}
                    className="border rounded px-3 py-2 w-full"
                    value={dependents.parents}
                    onChange={(e) =>
                      setDependents((d) => ({
                        ...d,
                        parents: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Right: Results */}
          <div>
            <div className="p-6 bg-white rounded shadow h-full flex flex-col">
              <h2 className="text-xl font-bold mb-4 text-primary-900">
                🧮 Your VA Compensation Results
              </h2>
              {disabilities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-5xl mb-2">🎖️</span>
                  <div className="text-lg font-medium">
                    Enter your disability ratings to see results
                  </div>
                  <div className="text-sm">
                    Your results will appear here once you've entered at least one
                    rating
                  </div>
                </div>
              ) : !data ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-5xl mb-2">⏳</span>
                  <div className="text-lg font-medium">
                    Loading 2025 VA rates...
                  </div>
                  <div className="text-sm">
                    Please wait while we load the latest official VA data.
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-primary-50 rounded border border-primary-100">
                    <div className="text-lg font-bold text-primary-800 mb-2">
                      Combined Rating: {combinedRounded}%
                    </div>
                    <div className="text-gray-700 text-sm mb-1">
                      (VA rounds to nearest 10%)
                    </div>
                    <div className="text-gray-700 text-sm">
                      {paymentBreakdown}
                    </div>
                  </div>
                  <div className="mb-4 p-4 bg-green-50 rounded border border-green-100">
                    <div className="text-lg font-bold text-green-800 mb-2">
                      Estimated Monthly Payment: $
                      {payment.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-gray-700 text-sm">
                      (2025 COLA rates, effective Dec 1, 2024)
                    </div>
                  </div>
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Breakdown:</h3>
                    <ul className="text-sm text-gray-700 list-disc pl-5">
                      {disabilities.map((d, i) => (
                        <li key={i}>
                          {d.percent}% (
                          {
                            extremities.find((e) => e.value === d.extremity)
                              ?.label
                          }
                          )
                        </li>
                      ))}
                      {dependents.childrenU18 > 0 && (
                        <li>{dependents.childrenU18} child(ren) under 18</li>
                      )}
                      {dependents.children18to24 > 0 && (
                        <li>{dependents.children18to24} child(ren) 18-24</li>
                      )}
                      {dependents.parents > 0 && (
                        <li>{dependents.parents} dependent parent(s)</li>
                      )}
                      {dependents.spouse && <li>Married</li>}
                      {dependents.spouseAA && (
                        <li>Spouse requires Aid & Attendance</li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-8 max-w-3xl mx-auto text-center px-4">
          This calculator provides an estimated VA disability rating and compensation amount for informational purposes only. Actual VA decisions may differ, because many factors—medical evidence, effective-date rules, special monthly compensation, offsets, and more—affect final ratings and payments. This tool is not affiliated with the U.S. Department of Veterans Affairs. For official guidance or help filing a claim, please contact an accredited Veterans Service Officer (e.g., your local DAV office). The figures shown here reflect the VA compensation tables effective December 1 2024 (2025 rate year).
        </div>
      </PageLayout>
    </>
  );
};

export default CalculatorPage;
