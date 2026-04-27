// lib/DiscountEngine.ts

export interface DiscountSignals {
  productScans: number;
  productSales: number;
  daysInInventory: number;
  isNewCustomer: boolean;
  cartValue: number;
  isSlowHour: boolean;
}

interface DiscountResult {
  shouldShow: boolean;
  score: number;
  offeredDiscount: number;
  message: string;
}

export function calculateGodLevelDiscount(signals: DiscountSignals): DiscountResult {
  let score = 0;

  // 🧮 1. CONVERSION SIGNAL (Scans vs Sales)
  const conversionRate = signals.productScans === 0 ? 1 : signals.productSales / signals.productScans;
  
  if (signals.productScans > 3 && signals.productSales === 0) {
    score += 4; // High interest, 0 buys -> Push hard!
  } else if (conversionRate < 0.2) {
    score += 3; // Low conversion
  } else if (conversionRate > 0.5) {
    score -= 3; // Fast moving item -> Protect Margin
  }

  // 🧮 2. INVENTORY SIGNAL (Dead stock tracking)
  if (signals.daysInInventory > 60) score += 3;
  else if (signals.daysInInventory > 30) score += 1;

  // 🧮 3. CUSTOMER SIGNAL
  if (signals.isNewCustomer) score += 2;

  // 🧮 4. CONTEXT SIGNAL
  if (signals.cartValue > 10000) score -= 2; // Already spending big -> Drop score
  if (signals.isSlowHour) score += 1; // Slow hours -> Push a bit

  // 🛑 HARD RULES (Non-negotiable Overrides)
  // If it's a hot item selling fast, immediately kill the discount.
  if (conversionRate >= 0.7 && signals.productSales > 5) {
    return { shouldShow: false, score, offeredDiscount: 0, message: "Fast moving item. No discount." };
  }

    // 🎲 CONTROLLED RANDOMNESS (The Wheel Logic)
  // Helper to pick based on probability
  const pickWeighted = (options: { value: number; weight: number }[]) => {
    const totalWeight = options.reduce((acc, curr) => acc + curr.weight, 0);
    let random = Math.random() * totalWeight;
    for (const option of options) {
      if (random < option.weight) return option.value;
      random -= option.weight;
    }
    // FIX: Array ke pehle item ki value return karni hai
    return options[0].value; 
  };


  let offeredDiscount = 0;
  let shouldShow = false;
  let message = "";

  // 🎯 BRACKET MAPPING
  if (score <= 2) {
    // Bucket 1: Score 0-2 (No Discount)
    shouldShow = false;
    offeredDiscount = 0;
    message = "Standard Pricing";
  } 
  else if (score >= 3 && score <= 5) {
    // Bucket 2: Score 3-5 (5-10% Range)
    shouldShow = true;
    offeredDiscount = pickWeighted([
      { value: 5, weight: 60 },  // 60% chance to get 5%
      { value: 8, weight: 30 },  // 30% chance to get 8%
      { value: 10, weight: 10 }  // 10% chance to get 10%
    ]);
    message = "Sweetener applied to close the deal.";
  } 
  else if (score >= 6 && score <= 8) {
    // Bucket 3: Score 6-8 (10-20% Range)
    shouldShow = true;
    offeredDiscount = pickWeighted([
      { value: 12, weight: 60 },
      { value: 15, weight: 30 },
      { value: 20, weight: 10 }
    ]);
    message = "Mid-tier push. Inventory moving slow.";
  } 
  else if (score >= 9) {
    // Bucket 4: Score 9+ (20-35% Range) - The Desperation Push
    shouldShow = true;
    offeredDiscount = pickWeighted([
      { value: 25, weight: 60 },
      { value: 30, weight: 30 },
      { value: 35, weight: 10 }
    ]);
    message = "High Urgency. Liquidating dead stock/capturing new user.";
  }

  return { shouldShow, score, offeredDiscount, message };
}
