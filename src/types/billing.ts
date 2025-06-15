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
