
export interface Product { // Represents a product generally, could be from AI or future DB
  id: string; // Can be a generated ID for items not in a DB
  name: string;
  price: number;
  stock?: number;
}

export interface CartItem {
  id: string; // Unique ID for the cart item instance
  productId: string; // Can be the AI identified name or a generated ID if no formal product catalog ID exists
  name: string;
  price: number; // Price per unit, can be the AI's price or manually overridden price
  quantity: number;
  originalPrice: number; // AI's initial estimated price or catalog price if available
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface BillRecord {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  currencySymbol: string;
  billImageDataUri: string | null;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
];

export const DEFAULT_CURRENCY_CODE = 'USD';

export function getCurrencySymbol(code: string | undefined): string {
  if (!code) return SUPPORTED_CURRENCIES.find(c => c.code === DEFAULT_CURRENCY_CODE)?.symbol || '$';
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
  return currency ? currency.symbol : SUPPORTED_CURRENCIES.find(c => c.code === DEFAULT_CURRENCY_CODE)?.symbol || '$';
}

export function getCurrencyCode(symbol: string | undefined): string {
    if (!symbol) return DEFAULT_CURRENCY_CODE;
    const currency = SUPPORTED_CURRENCIES.find(c => c.symbol === symbol);
    return currency ? currency.code : DEFAULT_CURRENCY_CODE;
}
