export interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number; // Optional: for future inventory features
}

export interface CartItem {
  productId: string;
  name: string;
  price: number; // Price per unit, can be the original or manually overridden price
  quantity: number;
  originalPrice: number; // Original price from product database
}
