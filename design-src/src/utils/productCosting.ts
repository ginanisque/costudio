export type ProductCosting = {
  fabricCostPerUnit?: number;
  fabricYardage?: number;
  productionHours?: number;
  hourlyRate?: number;
  productionQuantity?: number;
  otherCostPerItem?: number;
  markupPercent?: number;
  showPrice?: boolean;
};

const value = (input?: number) => Number.isFinite(Number(input)) && Number(input) > 0 ? Number(input) : 0;

export function calculateProductCosting(costing?: ProductCosting) {
  const quantity = Math.max(1, Math.round(value(costing?.productionQuantity) || 1));
  const materialCost = value(costing?.fabricCostPerUnit) * value(costing?.fabricYardage);
  const labourCost = value(costing?.productionHours) * value(costing?.hourlyRate);
  const unitCost = materialCost + labourCost + value(costing?.otherCostPerItem);
  const unitPrice = unitCost * (1 + value(costing?.markupPercent) / 100);
  return { quantity, materialCost, labourCost, unitCost, unitPrice, productionCost: unitCost * quantity };
}

export function formatProductMoney(amount: number, currencySymbol = '$') {
  return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
