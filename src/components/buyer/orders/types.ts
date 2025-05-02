export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image: string;
  product_id: string; // Adding proper UUID product ID field
}

export interface TrackingUpdate {
  status: string;
  location: string;
  timestamp: string;
}

export interface OrderTracking {
  id: string;
  courier: string;
  url: string;
  estimatedDelivery: string;
  currentLocation?: string;
  updates: TrackingUpdate[];
}

export interface Address {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  total: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking?: OrderTracking;
  addresses: Address;  // Changed from address to addresses
  phone: string;
}

// Modified to accept string status that will be cast to the required type
export type RawOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;  // Changed from literal union type to string to accept database values
  tracking_number?: string;
  tracking_url?: string;
  estimated_delivery?: string;
  buyer_id: string;
  addresses?: {  // Changed from address to addresses
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  profile?: {
    phone: string;
  };
}

export type RawOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    name: string;
  }
}

export type RawProductImage = {
  url: string;
  product_id: string;
}
