export function calculateCompensation(
  rating: number,
  hasSpouse: boolean,
  spouseAA: boolean,
  childU18: number,
  childO18: number,
  parentCount: number,
  vaData: any, // Use VA2025Payload if available
): { total: number; breakdown: string[] } {
  if (!vaData) return { total: 0, breakdown: ["Loading VA data..."] };
  if (rating === 10 || rating === 20) {
    return {
      total: vaData.flatRates[rating],
      breakdown: [`Flat rate for ${rating}%`],
    };
  }
  const hasKids = childU18 + childO18 > 0;
  const baseTable = hasKids ? vaData.baseOneChild : vaData.baseNoChild;
  let scenarioIndex = 0;
  if (hasSpouse) {
    scenarioIndex = 1 + parentCount;
  } else {
    scenarioIndex = 0;
  }
  const base = baseTable[rating]?.[scenarioIndex] || 0;
  const adds = vaData.addAmounts[rating];
  if (!adds) {
    return { total: base, breakdown: [`Base rate for ${rating}%`] };
  }
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
