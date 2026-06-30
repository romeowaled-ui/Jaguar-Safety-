export interface Product {
  __backendId: string;
  type: 'product';
  name: string;
  description: string;
  price: number;
  discount_price: number;
  category: string;
  colors: string; // JSON string representing string[]
  sizes: string; // JSON string representing string[]
  inventory: string; // JSON string representing Record<string, number>
  extras: string; // JSON string representing { name: string; price: number }[]
  images: string; // JSON string representing string[]
  color_image_map: string; // JSON string representing Record<string, string>
  status: 'active' | 'inactive';
  created_at: string;
}

export interface OrderItem {
  name: string;
  color: string;
  size: string;
  extra: string;
  qty: number;
  price: number;
}

export interface Order {
  __backendId: string;
  type: 'order';
  order_customer_name: string;
  order_email: string;
  order_phone: string;
  order_alt_phone?: string;
  order_state?: string;
  order_address: string;
  order_items: string; // JSON string representing OrderItem[]
  order_total: number;
  order_status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  order_coupon?: string;
  order_discount?: number;
  order_shipping_zone?: string;
  order_shipping_fee?: number;
  order_notes?: string;
}

export interface Coupon {
  __backendId: string;
  type: 'coupon';
  coupon_code: string;
  coupon_discount: number; // percentage
  coupon_usage_limit: number;
  coupon_usage_count: number;
}

export interface ShippingZone {
  __backendId: string;
  type: 'shipping_zone';
  shipping_zone_name: string;
  shipping_zone_price: number;
}

export interface StoreSettings {
  __backendId: string;
  type: 'settings';
  settings_store_name: string;
  settings_logo_url: string;
  settings_admin_logo_url: string;
  settings_store_name_image_url: string;
  social_facebook: string;
  social_instagram: string;
  social_tiktok: string;
  social_twitter: string;
  social_whatsapp: string;
}

export interface Banner {
  __backendId: string;
  type: 'banner';
  banner_position: 'top' | 'middle' | 'before_last' | 'bottom';
  banner_image_url: string;
  banner_enabled: boolean;
  banner_size: 'square' | 'rectangle' | 'custom';
  banner_width: number;
  banner_height: number;
}

export interface AdminPasswordRecord {
  __backendId: string;
  type: 'admin_password_record';
  admin_password: string;
}

export interface CartItem {
  productId: string;
  color: string;
  size: string;
  extra: string;
  qty: number;
}

export interface PdpState {
  imgIdx: number;
  color: string;
  size: string;
  extra: string;
  qty: number;
}

export interface CheckoutState {
  shippingZone: string;
  appliedCoupon: string | null;
  discountAmount: number;
}

export interface Reel {
  __backendId: string;
  type: 'reel';
  reel_url: string;
  reel_title?: string;
  reel_description?: string;
}

