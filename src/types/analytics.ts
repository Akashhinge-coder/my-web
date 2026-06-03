export interface AnalyticsDayData {
  date: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsDishData {
  name: string;
  count: number;
  revenue: number;
}

export interface AnalyticsPaymentData {
  method: string;
  amount: number;
  count: number;
}

export interface AnalyticsPeakHour {
  hour: number;
  count: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  subtotal: number;
  totalDiscount: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  happyHourDiscount: number;
  tax: number;
  taxableAmount: number;
  totalOrders: number;
  totalCovers: number;
  avgOrder: number;
  avgRating: number;
}

export interface AnalyticsDashboard {
  summary: AnalyticsSummary;
  dailyData: AnalyticsDayData[];
  topDishes: AnalyticsDishData[];
  paymentData: AnalyticsPaymentData[];
  peakHours: AnalyticsPeakHour[];
}

export interface AnalyticsSalesReport {
  totalRevenue: number;
  subtotal: number;
  totalDiscount: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  happyHourDiscount: number;
  tax: number;
  taxableAmount: number;
  avgOrder: number;
  dailyData: AnalyticsDayData[];
  paymentData: AnalyticsPaymentData[];
}

export interface AnalyticsOrdersReport {
  totalOrders: number;
  avgOrder: number;
  dailyData: AnalyticsDayData[];
  topDishes: AnalyticsDishData[];
  peakHours: AnalyticsPeakHour[];
}

export interface AnalyticsCustomersReport {
  totalCovers: number;
  avgRating: number;
  ratingCount: number;
}
