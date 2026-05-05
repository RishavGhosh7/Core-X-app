export const users = [
  {
    id: "user_amex_1",
    name: "Riya Chen",
    verticalAffinity: {
      DINING: 1.25,
      TRAVEL: 1.15,
      PAYMENT: 1
    }
  }
];

export const policies = [
  {
    userId: "user_amex_1",
    maxIntentAmount: 2500,
    blockedMerchants: ["Unknown Vendor"],
    requiresReceiptAbove: 120
  }
];

export const offers = [
  {
    id: "offer_travel_01",
    title: "8% back on flights",
    merchantPattern: "air",
    vertical: "TRAVEL",
    baseBoost: 20
  },
  {
    id: "offer_dining_01",
    title: "15% off dining Fridays",
    merchantPattern: "bistro",
    vertical: "DINING",
    baseBoost: 24
  },
  {
    id: "offer_payments_01",
    title: "2% utility autopay cash back",
    merchantPattern: "utility",
    vertical: "PAYMENT",
    baseBoost: 10
  },
  {
    id: "offer_mixed_01",
    title: "5% back on rides and transit",
    merchantPattern: "ride",
    vertical: "PAYMENT",
    baseBoost: 14
  }
];

export const state = {
  intents: [],
  decisions: [],
  offerRanks: [],
  offerImpressions: [],
  expenseLines: [],
  receipts: [],
  aggregatesByUser: {},
  idempotencyKeys: {},
  realtimeVersion: 0,
  lastEvaluation: null,
  events: []
};
