export const cards = [
  {
    id: "1",
    name: "Platinum Card",
    type: "platinum",
    lastFour: "1001",
    balance: 124300,
    limit: 500000,
    color: "#212529",
    gradient: "linear-gradient(135deg, #2d3436 0%, #636e72 50%, #2d3436 100%)"
  },
  {
    id: "2",
    name: "Gold Card",
    type: "gold",
    lastFour: "5678",
    balance: 45200,
    limit: 200000,
    color: "#cc9700",
    gradient: "linear-gradient(135deg, #f7b731 0%, #d4a017 50%, #b8860b 100%)"
  },
  {
    id: "3",
    name: "Corporate Card",
    type: "corporate",
    lastFour: "9012",
    balance: 89500,
    limit: 300000,
    color: "#0066ff",
    gradient: "linear-gradient(135deg, #0066ff 0%, #0052cc 50%, #003d99 100%)"
  }
];

export const recentTransactions = [
  { id: "1", merchant: "The Oberoi", category: "Dining", amount: -4200, date: "Today", icon: "UtensilsCrossed" },
  { id: "2", merchant: "IndiGo Airlines", category: "Travel", amount: -12800, date: "Yesterday", icon: "Plane" },
  { id: "3", merchant: "Amazon", category: "Shopping", amount: -3499, date: "Yesterday", icon: "ShoppingBag" },
  { id: "4", merchant: "Uber", category: "Transport", amount: -540, date: "2 days ago", icon: "Car" },
  { id: "5", merchant: "Starbucks", category: "Dining", amount: -680, date: "2 days ago", icon: "Coffee" },
  { id: "6", merchant: "Taj Hotels", category: "Travel", amount: -18500, date: "3 days ago", icon: "Building2" }
];

export const expenses = [
  { id: "1", merchant: "Client Dinner - ITC Maurya", category: "Dining", amount: 8400, date: "May 4", status: "approved" },
  { id: "2", merchant: "Flight to Mumbai", category: "Travel", amount: 15200, date: "May 3", status: "approved" },
  { id: "3", merchant: "Airport Cab", category: "Transport", amount: 1200, date: "May 3", status: "pending" },
  { id: "4", merchant: "Hotel Trident", category: "Lodging", amount: 22000, date: "May 2", status: "flagged", policyNote: "Exceeds nightly rate limit by 2,000" },
  { id: "5", merchant: "Team Lunch", category: "Dining", amount: 5600, date: "May 1", status: "missing_receipt", policyNote: "Receipt required for amounts over 5,000" },
  { id: "6", merchant: "Conference Registration", category: "Other", amount: 18000, date: "Apr 30", status: "approved" },
  { id: "7", merchant: "Co-working Space", category: "Office", amount: 3500, date: "Apr 29", status: "approved" },
  { id: "8", merchant: "Client Gifts", category: "Other", amount: 9200, date: "Apr 28", status: "flagged", policyNote: "Gift limit is 5,000 per client" }
];

export const offers = [
  {
    id: "1",
    title: "20% Off Weekend Brunch",
    description: "Enjoy a luxurious weekend brunch at participating fine dining restaurants",
    category: "dining",
    discount: "20% OFF",
    merchant: "Fine Dining Collection",
    expires: "May 31",
    image: "https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=600",
    isPersonalized: true
  },
  {
    id: "2",
    title: "Flat 15% Cashback on Flights",
    description: "Book domestic flights and get instant cashback on your Platinum Card",
    category: "travel",
    discount: "15% BACK",
    merchant: "IndiGo & Vistara",
    expires: "Jun 15",
    image: "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg?auto=compress&cs=tinysrgb&w=600",
    isPersonalized: true
  },
  {
    id: "3",
    title: "10% Off at Starbucks",
    description: "Your morning coffee just got better. Valid on all beverages.",
    category: "dining",
    discount: "10% OFF",
    merchant: "Starbucks",
    expires: "Jun 30",
    image: "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "4",
    title: "5x Reward Points on Shopping",
    description: "Earn 5x points on all online shopping this month",
    category: "shopping",
    discount: "5X POINTS",
    merchant: "Amazon, Myntra & more",
    expires: "May 31",
    image: "https://images.pexels.com/photos/5632399/pexels-photo-5632399.jpeg?auto=compress&cs=tinysrgb&w=600",
    isPersonalized: true
  },
  {
    id: "5",
    title: "Luxury Hotel Suite Upgrade",
    description: "Book a standard room and get a complimentary suite upgrade",
    category: "travel",
    discount: "FREE UPGRADE",
    merchant: "Taj & Oberoi Hotels",
    expires: "Jul 31",
    image: "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "6",
    title: "Spa & Wellness Discount",
    description: "Relax with 25% off at premium spas and wellness centers",
    category: "entertainment",
    discount: "25% OFF",
    merchant: "Luxury Spas",
    expires: "Jun 15",
    image: "https://images.pexels.com/photos/3757655/pexels-photo-3757655.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "7",
    title: "Movie Night Special",
    description: "Buy 1 Get 1 on movie tickets every Wednesday",
    category: "entertainment",
    discount: "BOGO",
    merchant: "PVR Cinemas",
    expires: "May 31",
    image: "https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "8",
    title: "Fashion Week Sale",
    description: "Extra 30% off on designer labels with your Amex card",
    category: "shopping",
    discount: "30% OFF",
    merchant: "Premium Boutiques",
    expires: "Jun 10",
    image: "https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=600"
  }
];

export const insights = [
  {
    id: "1",
    type: "spending",
    title: "Dining spend up 22%",
    description: "You spent 22% more on dining this week compared to your average",
    icon: "TrendingUp"
  },
  {
    id: "2",
    type: "savings",
    title: "Flight prices to Goa dropping",
    description: "Round-trip flights from Kolkata to Goa are 35% below average",
    icon: "Plane"
  },
  {
    id: "3",
    type: "alert",
    title: "Payment due in 5 days",
    description: "Your Platinum Card payment of 24,430 is due May 10",
    icon: "AlertCircle"
  },
  {
    id: "4",
    type: "tip",
    title: "Use your Gold Card for dining",
    description: "You could earn 4x more points on restaurant purchases",
    icon: "Lightbulb"
  }
];

export const expenseCategories = [
  { name: "Travel", amount: 45200, percentage: 42, color: "#0066ff" },
  { name: "Dining", amount: 28400, percentage: 26, color: "#00e68a" },
  { name: "Lodging", amount: 22000, percentage: 20, color: "#ffbd00" },
  { name: "Transport", amount: 5400, percentage: 5, color: "#ff6b6b" },
  { name: "Other", amount: 7100, percentage: 7, color: "#868e96" }
];

export const monthlySpending = [
  { month: "Jan", amount: 78000 },
  { month: "Feb", amount: 92000 },
  { month: "Mar", amount: 85000 },
  { month: "Apr", amount: 108000 },
  { month: "May", amount: 108100 }
];

export const exploreCategories = [
  { id: "travel", label: "Travel", icon: "Plane" },
  { id: "dining", label: "Dining", icon: "UtensilsCrossed" },
  { id: "shopping", label: "Shopping", icon: "ShoppingBag" },
  { id: "entertainment", label: "Entertainment", icon: "Ticket" }
];

export const aiSuggestions = [
  {
    id: "1",
    title: "Weekend Getaway from Kolkata",
    description: "Curated trips under 3 hours from Kolkata",
    type: "travel",
    image: "https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "2",
    title: "Top Dining Offers Near You",
    description: "5 restaurants with Amex offers within 2 km",
    type: "dining",
    image: "https://images.pexels.com/photos/1414687/pexels-photo-1414687.jpeg?auto=compress&cs=tinysrgb&w=600"
  },
  {
    id: "3",
    title: "Summer Fashion Picks",
    description: "Trending styles with card-linked offers",
    type: "shopping",
    image: "https://images.pexels.com/photos/325876/pexels-photo-325876.jpeg?auto=compress&cs=tinysrgb&w=600"
  }
];
