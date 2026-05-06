export const users = [
  {
    id: "user_amex_1",
    name: "Rishav Ghosh",
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
    maxIntentAmount: 100000,
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

export const defaultCards = [
  {
    id: "1",
    name: "Platinum Card",
    type: "platinum",
    lastFour: "1001",
    balance: 100000000,
    limit: 10000000,
    color: "#212529",
    gradient: "linear-gradient(135deg, #2d3436 0%, #636e72 50%, #2d3436 100%)"
  },
  {
    id: "2",
    name: "Gold Card",
    type: "gold",
    lastFour: "5678",
    balance: 100000000,
    limit: 4000000,
    color: "#cc9700",
    gradient: "linear-gradient(135deg, #f7b731 0%, #d4a017 50%, #b8860b 100%)"
  },
  {
    id: "3",
    name: "Corporate Card",
    type: "corporate",
    lastFour: "9012",
    balance: 100000000,
    limit: 4000000,
    color: "#0066ff",
    gradient: "linear-gradient(135deg, #0066ff 0%, #0052cc 50%, #003d99 100%)"
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
  cardsByUser: {},
  rewardBalanceByUser: {},
  redeemedOffersByUser: {},
  realtimeVersion: 0,
  lastEvaluation: null,
  events: []
};
