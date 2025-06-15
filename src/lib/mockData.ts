import type { Product } from '@/types/billing';

export const MOCK_PRODUCTS_LIST: Product[] = [
  { id: '1001', name: 'Organic Milk', price: 3.50 },
  { id: '1002', name: 'Sourdough Bread', price: 4.20 },
  { id: '1003', name: 'Free-Range Eggs (12ct)', price: 5.00 },
  { id: '1004', name: 'Avocado', price: 1.75 },
  { id: '1005', name: 'Artisan Coffee Beans', price: 12.99 },
  { id: '1006', name: 'Imported Olive Oil', price: 9.50 },
  { id: '1007', name: 'Gourmet Chocolate Bar', price: 3.25 },
  { id: '1008', name: 'Fresh Orange Juice (1L)', price: 4.00 },
  { id: '1009', name: 'Greek Yogurt (500g)', price: 3.75 },
  { id: '1010', name: 'Quinoa (1kg)', price: 6.50 },
  { id: '1011', name: 'Sparkling Water (6 pack)', price: 5.25},
  { id: '1012', name: 'Organic Apples (per lb)', price: 2.99},
  { id: '1013', name: 'Cheddar Cheese Block', price: 6.70},
  { id: '1014', name: 'Whole Wheat Pasta', price: 2.50},
  { id: '1015', name: 'Natural Peanut Butter', price: 4.80},
];

export const MOCK_PRODUCTS_MAP: Map<string, Product> = new Map(
  MOCK_PRODUCTS_LIST.map(product => [product.id, product])
);
