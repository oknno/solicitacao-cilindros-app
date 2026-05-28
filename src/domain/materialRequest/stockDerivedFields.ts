export interface CalculateStockDerivedFieldsInput {
  evaluatedStockTotal: number | null;
  averagePrice: number | null;
  consumption2021: number | null;
  consumption2022: number | null;
  consumption2023: number | null;
  consumption2024: number | null;
  consumption2025: number | null;
  consumption2026: number | null;
}

export interface CalculatedStockDerivedFields {
  totalStockValueBRL: number;
  historicalTotal: number;
  consumptionYearsCount: number;
  averageAnnualConsumption: number;
}

const toCalculationNumber = (value: number | null): number => value ?? 0;

export function calculateStockDerivedFields(input: CalculateStockDerivedFieldsInput): CalculatedStockDerivedFields {
  const evaluatedStockTotal = toCalculationNumber(input.evaluatedStockTotal);
  const averagePrice = toCalculationNumber(input.averagePrice);
  const consumptionValues = [
    input.consumption2021,
    input.consumption2022,
    input.consumption2023,
    input.consumption2024,
    input.consumption2025,
    input.consumption2026
  ].map(toCalculationNumber);

  const historicalTotal = consumptionValues.reduce((total, value) => total + value, 0);
  const consumptionYearsCount = consumptionValues.filter((value) => value > 0).length;

  return {
    totalStockValueBRL: evaluatedStockTotal * averagePrice,
    historicalTotal,
    consumptionYearsCount,
    averageAnnualConsumption: consumptionYearsCount > 0 ? historicalTotal / consumptionYearsCount : 0
  };
}
