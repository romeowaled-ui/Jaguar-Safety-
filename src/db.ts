import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { Product, Order, Coupon, ShippingZone, StoreSettings, Banner, Reel } from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// Seed Images
const SEED_IMAGES = {
  watchBlack: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  watchBrown: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&auto=format&fit=crop&q=80',
  headphonesSilver: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  headphonesBlack: 'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=600&auto=format&fit=crop&q=80',
  backpackGrey: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
  backpackOlive: 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=600&auto=format&fit=crop&q=80',
  sneakerWhite: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  topBanner: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
  middleBanner: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80'
};

const SEED_PRODUCTS: Product[] = [
  {
    __backendId: 'prod_1',
    type: 'product',
    name: 'Aura Chronograph Quartz Watch',
    description: 'Precision timekeeping paired with architectural minimalist aesthetic. Crafted from surgical-grade stainless steel with genuine leather straps.',
    price: 199.00,
    discount_price: 149.00,
    category: 'Accessories',
    colors: JSON.stringify(['#1a1a1a', '#8b5a2b']), // Black and Brown
    sizes: JSON.stringify(['40mm', '44mm']),
    inventory: JSON.stringify({
      '#1a1a1a__40mm': 15,
      '#1a1a1a__44mm': 10,
      '#8b5a2b__40mm': 8,
      '#8b5a2b__44mm': 12
    }),
    extras: JSON.stringify([
      { name: 'Extended 3-Year Warranty', price: 19.99 },
      { name: 'Premium Velvet Gift Wrap', price: 5.99 }
    ]),
    images: JSON.stringify([SEED_IMAGES.watchBlack, SEED_IMAGES.watchBrown]),
    color_image_map: JSON.stringify({
      '#1a1a1a': '0',
      '#8b5a2b': '1'
    }),
    status: 'active',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    __backendId: 'prod_2',
    type: 'product',
    name: 'AcousticMax Wireless Headphones',
    description: 'Immersive sound with industry-leading hybrid active noise cancellation (ANC). Enjoy ultra-comfortable memory foam earcups and up to 40 hours of continuous playback.',
    price: 299.00,
    discount_price: 249.00,
    category: 'Electronics',
    colors: JSON.stringify(['#ffffff', '#111827']), // Silver/White and Matte Black
    sizes: JSON.stringify(['Standard']),
    inventory: JSON.stringify({
      '#ffffff__Standard': 25,
      '#111827__Standard': 30
    }),
    extras: JSON.stringify([
      { name: 'Hard Shell Carrying Case', price: 14.99 },
      { name: 'Audio Cable Adapter Pack', price: 4.99 }
    ]),
    images: JSON.stringify([SEED_IMAGES.headphonesSilver, SEED_IMAGES.headphonesBlack]),
    color_image_map: JSON.stringify({
      '#ffffff': '0',
      '#111827': '1'
    }),
    status: 'active',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    __backendId: 'prod_3',
    type: 'product',
    name: 'Nomad Tech Waterproof Backpack',
    description: 'Designed for the modern commuter and traveler. Features a fully padded 16-inch laptop pocket, hidden anti-theft zipper compartments, and military-grade waterproof fabric.',
    price: 89.00,
    discount_price: 0,
    category: 'Travel Bags',
    colors: JSON.stringify(['#4b5563', '#1b4d3e']), // Grey and Olive
    sizes: JSON.stringify(['18 Liters', '24 Liters']),
    inventory: JSON.stringify({
      '#4b5563__18 Liters': 20,
      '#4b5563__24 Liters': 15,
      '#1b4d3e__18 Liters': 12,
      '#1b4d3e__24 Liters': 18
    }),
    extras: JSON.stringify([
      { name: 'Integrated USB Powerbank 10k', price: 24.99 },
      { name: 'Heavy-Duty Rain Cover', price: 6.99 }
    ]),
    images: JSON.stringify([SEED_IMAGES.backpackGrey, SEED_IMAGES.backpackOlive]),
    color_image_map: JSON.stringify({
      '#4b5563': '0',
      '#1b4d3e': '1'
    }),
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    __backendId: 'prod_4',
    type: 'product',
    name: 'Stratus LiteRun Performance Sneakers',
    description: 'Engineered with responsive honeycomb air-cushioning. Lightweight breathable knit mesh upper ensures comfort during intense running sessions.',
    price: 120.00,
    discount_price: 95.00,
    category: 'Footwear',
    colors: JSON.stringify(['#ef4444']), // Red
    sizes: JSON.stringify(['41', '42', '43', '44']),
    inventory: JSON.stringify({
      '#ef4444__41': 10,
      '#ef4444__42': 14,
      '#ef4444__43': 8,
      '#ef4444__44': 5
    }),
    extras: JSON.stringify([
      { name: 'Odour Protection Cushioned Insoles', price: 7.99 },
      { name: 'Premium Sport Reflective Laces', price: 3.99 }
    ]),
    images: JSON.stringify([SEED_IMAGES.sneakerWhite]),
    color_image_map: JSON.stringify({
      '#ef4444': '0'
    }),
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_COUPONS: Coupon[] = [
  { __backendId: 'coup_1', type: 'coupon', coupon_code: 'SUMMER20', coupon_discount: 20, coupon_usage_limit: 100, coupon_usage_count: 14 },
  { __backendId: 'coup_2', type: 'coupon', coupon_code: 'WELCOME10', coupon_discount: 10, coupon_usage_limit: 50, coupon_usage_count: 2 }
];

const SEED_SHIPPING_ZONES: ShippingZone[] = [
  { __backendId: 'ship_1', type: 'shipping_zone', shipping_zone_name: 'Standard Courier Shipping', shipping_zone_price: 4.99 },
  { __backendId: 'ship_2', type: 'shipping_zone', shipping_zone_name: 'VIP Express Next-Day Delivery', shipping_zone_price: 19.99 },
  { __backendId: 'ship_3', type: 'shipping_zone', shipping_zone_name: 'Worldwide Registered Cargo', shipping_zone_price: 29.99 }
];

const SEED_BANNERS: Banner[] = [
  {
    __backendId: 'ban_1',
    type: 'banner',
    banner_position: 'top',
    banner_image_url: SEED_IMAGES.topBanner,
    banner_enabled: true,
    banner_size: 'rectangle',
    banner_width: 0,
    banner_height: 0
  },
  {
    __backendId: 'ban_2',
    type: 'banner',
    banner_position: 'middle',
    banner_image_url: SEED_IMAGES.middleBanner,
    banner_enabled: true,
    banner_size: 'rectangle',
    banner_width: 0,
    banner_height: 0
  }
];

const SEED_REELS: Reel[] = [
  {
    __backendId: 'reel_1',
    type: 'reel',
    reel_url: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-holding-camera-34241-large.mp4',
    reel_title: 'Unboxing Modern Tech Gear',
    reel_description: 'Pure tech elegance showcased with beautiful neon style lights. Check it out!'
  },
  {
    __backendId: 'reel_2',
    type: 'reel',
    reel_url: 'https://assets.mixkit.co/videos/preview/mixkit-serving-coffee-with-latte-art-41607-large.mp4',
    reel_title: 'Crafting the Ultimate Morning Coffee',
    reel_description: 'Elegance in every second. A perfect companion for your desktop.'
  }
];

const DEFAULT_SETTINGS: StoreSettings = {
  __backendId: 'sett_1',
  type: 'settings',
  settings_store_name: 'Jaguar Safety',
  settings_logo_url: '',
  settings_admin_logo_url: '',
  settings_store_name_image_url: '',
  social_facebook: 'https://facebook.com',
  social_instagram: 'https://instagram.com',
  social_tiktok: '',
  social_twitter: 'https://twitter.com',
  social_whatsapp: '+966500000000'
};

const DEFAULT_PASSWORD = 'Poiuy8995';

// Firebase Config
const firebaseConfig = {
  projectId: "hidden-adviser-c09p9",
  appId: "1:982034134336:web:79a25312baeb5887dc36a5",
  apiKey: "AIzaSyCB9FZ_lwDstLYW-77Td7O0Vnp27-h2rL0",
  authDomain: "hidden-adviser-c09p9.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-jaguarsafety-a667c055-9592-46ab-b3f2-f07519940814",
  storageBucket: "hidden-adviser-c09p9.firebasestorage.app",
  messagingSenderId: "982034134336"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Subscription system
const subscribers = new Set<() => void>();
function notifySubscribers() {
  subscribers.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('Error in db subscriber callback:', e);
    }
  });
}

// In-Memory synchronous cache (initialized with default/seed values for an instant loading screen)
let cachedProducts: Product[] = [...SEED_PRODUCTS];
let cachedOrders: Order[] = [];
let cachedCoupons: Coupon[] = [...SEED_COUPONS];
let cachedShippingZones: ShippingZone[] = [...SEED_SHIPPING_ZONES];
let cachedBanners: Banner[] = [...SEED_BANNERS];
let cachedReels: Reel[] = [...SEED_REELS];
let cachedSettings: StoreSettings = { ...DEFAULT_SETTINGS };
let cachedPassword = DEFAULT_PASSWORD;
let cachedDisplayOrder: string[] = SEED_PRODUCTS.map(p => p.__backendId);

// Setup onSnapshot real-time sync listeners
let productsSeeded = false;
onSnapshot(collection(firestoreDb, 'products'), (snapshot) => {
  if (snapshot.empty && !productsSeeded) {
    productsSeeded = true;
    SEED_PRODUCTS.forEach(p => {
      setDoc(doc(firestoreDb, 'products', p.__backendId), p);
    });
  } else {
    cachedProducts = snapshot.docs.map(doc => doc.data() as Product);
    notifySubscribers();
  }
}, (err) => console.error('Products listener error:', err));

onSnapshot(collection(firestoreDb, 'orders'), (snapshot) => {
  cachedOrders = snapshot.docs.map(doc => doc.data() as Order);
  // Sort orders by date descending
  cachedOrders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
  notifySubscribers();
}, (err) => console.error('Orders listener error:', err));

let couponsSeeded = false;
onSnapshot(collection(firestoreDb, 'coupons'), (snapshot) => {
  if (snapshot.empty && !couponsSeeded) {
    couponsSeeded = true;
    SEED_COUPONS.forEach(c => {
      setDoc(doc(firestoreDb, 'coupons', c.__backendId), c);
    });
  } else {
    cachedCoupons = snapshot.docs.map(doc => doc.data() as Coupon);
    notifySubscribers();
  }
}, (err) => console.error('Coupons listener error:', err));

let shippingZonesSeeded = false;
onSnapshot(collection(firestoreDb, 'shipping_zones'), (snapshot) => {
  if (snapshot.empty && !shippingZonesSeeded) {
    shippingZonesSeeded = true;
    SEED_SHIPPING_ZONES.forEach(z => {
      setDoc(doc(firestoreDb, 'shipping_zones', z.__backendId), z);
    });
  } else {
    cachedShippingZones = snapshot.docs.map(doc => doc.data() as ShippingZone);
    notifySubscribers();
  }
}, (err) => console.error('Shipping zones listener error:', err));

let bannersSeeded = false;
onSnapshot(collection(firestoreDb, 'banners'), (snapshot) => {
  if (snapshot.empty && !bannersSeeded) {
    bannersSeeded = true;
    SEED_BANNERS.forEach(b => {
      setDoc(doc(firestoreDb, 'banners', b.__backendId), b);
    });
  } else {
    cachedBanners = snapshot.docs.map(doc => doc.data() as Banner);
    notifySubscribers();
  }
}, (err) => console.error('Banners listener error:', err));

let reelsSeeded = false;
onSnapshot(collection(firestoreDb, 'reels'), (snapshot) => {
  if (snapshot.empty && !reelsSeeded) {
    reelsSeeded = true;
    SEED_REELS.forEach(r => {
      setDoc(doc(firestoreDb, 'reels', r.__backendId), r);
    });
  } else {
    cachedReels = snapshot.docs.map(doc => doc.data() as Reel);
    notifySubscribers();
  }
}, (err) => console.error('Reels listener error:', err));

let settingsSeeded = false;
onSnapshot(doc(firestoreDb, 'settings', 'sett_1'), (docSnap) => {
  if (!docSnap.exists() && !settingsSeeded) {
    settingsSeeded = true;
    setDoc(doc(firestoreDb, 'settings', 'sett_1'), DEFAULT_SETTINGS);
  } else if (docSnap.exists()) {
    cachedSettings = docSnap.data() as StoreSettings;
    notifySubscribers();
  }
}, (err) => console.error('Settings listener error:', err));

let passwordSeeded = false;
onSnapshot(doc(firestoreDb, 'admin_password', 'password_doc'), (docSnap) => {
  if (!docSnap.exists() && !passwordSeeded) {
    passwordSeeded = true;
    setDoc(doc(firestoreDb, 'admin_password', 'password_doc'), { password: DEFAULT_PASSWORD });
  } else if (docSnap.exists()) {
    cachedPassword = docSnap.data().password as string;
    notifySubscribers();
  }
}, (err) => console.error('Password listener error:', err));

let displayOrderSeeded = false;
onSnapshot(doc(firestoreDb, 'product_display_order', 'order_doc'), (docSnap) => {
  if (!docSnap.exists() && !displayOrderSeeded) {
    displayOrderSeeded = true;
    const initialOrder = SEED_PRODUCTS.map(p => p.__backendId);
    setDoc(doc(firestoreDb, 'product_display_order', 'order_doc'), { order: initialOrder });
  } else if (docSnap.exists()) {
    cachedDisplayOrder = docSnap.data().order as string[];
    notifySubscribers();
  }
}, (err) => console.error('Display order listener error:', err));

export function initDB() {
  // Backwards compatible dummy call
}

export const db = {
  // REAL-TIME SUBSCRIBER REGISTRATION
  subscribe(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },

  // PRODUCTS
  getProducts(): Product[] {
    return [...cachedProducts];
  },
  saveProduct(p: Partial<Product> & { name: string; price: number }): Product {
    let savedProduct: Product;

    if (p.__backendId) {
      // Edit
      const index = cachedProducts.findIndex(item => item.__backendId === p.__backendId);
      savedProduct = { ...(index !== -1 ? cachedProducts[index] : {}), ...p } as Product;
      if (index !== -1) {
        cachedProducts = cachedProducts.map((item, idx) => idx === index ? savedProduct : item);
      } else {
        cachedProducts = [...cachedProducts, savedProduct];
      }
    } else {
      // Create
      savedProduct = {
        ...p,
        __backendId: 'prod_' + generateId(),
        type: 'product',
        colors: p.colors || '[]',
        sizes: p.sizes || '[]',
        inventory: p.inventory || '{}',
        extras: p.extras || '[]',
        images: p.images || '[]',
        color_image_map: p.color_image_map || '{}',
        status: p.status || 'active',
        created_at: new Date().toISOString()
      } as Product;
      cachedProducts = [...cachedProducts, savedProduct];

      // Append to display order
      cachedDisplayOrder = [...cachedDisplayOrder, savedProduct.__backendId];
      setDoc(doc(firestoreDb, 'product_display_order', 'order_doc'), { order: cachedDisplayOrder });
    }

    // Write to Firestore and trigger optimistic update locally
    setDoc(doc(firestoreDb, 'products', savedProduct.__backendId), savedProduct);
    notifySubscribers();

    return savedProduct;
  },
  deleteProduct(backendId: string): boolean {
    const lengthBefore = cachedProducts.length;
    cachedProducts = cachedProducts.filter(p => p.__backendId !== backendId);
    cachedDisplayOrder = cachedDisplayOrder.filter(id => id !== backendId);

    // Write deletion to Firestore
    deleteDoc(doc(firestoreDb, 'products', backendId));
    setDoc(doc(firestoreDb, 'product_display_order', 'order_doc'), { order: cachedDisplayOrder });

    notifySubscribers();
    return cachedProducts.length < lengthBefore;
  },

  // ORDERS
  getOrders(): Order[] {
    return [...cachedOrders];
  },
  saveOrder(o: Partial<Order> & { order_customer_name: string; order_total: number }): Order {
    let savedOrder: Order;

    if (o.__backendId) {
      // Edit
      const index = cachedOrders.findIndex(item => item.__backendId === o.__backendId);
      savedOrder = { ...(index !== -1 ? cachedOrders[index] : {}), ...o } as Order;
      if (index !== -1) {
        cachedOrders = cachedOrders.map((item, idx) => idx === index ? savedOrder : item);
      } else {
        cachedOrders = [...cachedOrders, savedOrder];
      }
    } else {
      // Create
      savedOrder = {
        ...o,
        __backendId: 'ord_' + generateId(),
        type: 'order',
        order_status: o.order_status || 'pending',
        order_date: new Date().toISOString(),
        order_items: o.order_items || '[]'
      } as Order;
      cachedOrders = [...cachedOrders, savedOrder];
    }

    // Write to Firestore and trigger optimistic update locally
    setDoc(doc(firestoreDb, 'orders', savedOrder.__backendId), savedOrder);
    notifySubscribers();

    return savedOrder;
  },
  deleteOrder(backendId: string): boolean {
    const lengthBefore = cachedOrders.length;
    cachedOrders = cachedOrders.filter(o => o.__backendId !== backendId);

    deleteDoc(doc(firestoreDb, 'orders', backendId));
    notifySubscribers();

    return cachedOrders.length < lengthBefore;
  },
  updateOrderStatus(backendId: string, status: Order['order_status']): Order | null {
    const index = cachedOrders.findIndex(item => item.__backendId === backendId);
    if (index === -1) return null;

    const updated = { ...cachedOrders[index], order_status: status };
    cachedOrders = cachedOrders.map((item, idx) => idx === index ? updated : item);

    setDoc(doc(firestoreDb, 'orders', backendId), updated);
    notifySubscribers();

    return updated;
  },

  // COUPONS
  getCoupons(): Coupon[] {
    return [...cachedCoupons];
  },
  saveCoupon(c: Partial<Coupon> & { coupon_code: string; coupon_discount: number }): Coupon {
    let savedCoupon: Coupon;

    if (c.__backendId) {
      const index = cachedCoupons.findIndex(item => item.__backendId === c.__backendId);
      savedCoupon = { ...(index !== -1 ? cachedCoupons[index] : {}), ...c } as Coupon;
      if (index !== -1) {
        cachedCoupons = cachedCoupons.map((item, idx) => idx === index ? savedCoupon : item);
      } else {
        cachedCoupons = [...cachedCoupons, savedCoupon];
      }
    } else {
      savedCoupon = {
        ...c,
        __backendId: 'coup_' + generateId(),
        type: 'coupon',
        coupon_usage_count: 0
      } as Coupon;
      cachedCoupons = [...cachedCoupons, savedCoupon];
    }

    setDoc(doc(firestoreDb, 'coupons', savedCoupon.__backendId), savedCoupon);
    notifySubscribers();

    return savedCoupon;
  },
  deleteCoupon(backendId: string): boolean {
    const lengthBefore = cachedCoupons.length;
    cachedCoupons = cachedCoupons.filter(c => c.__backendId !== backendId);

    deleteDoc(doc(firestoreDb, 'coupons', backendId));
    notifySubscribers();

    return cachedCoupons.length < lengthBefore;
  },

  // SHIPPING ZONES
  getShippingZones(): ShippingZone[] {
    return [...cachedShippingZones];
  },
  saveShippingZone(z: Partial<ShippingZone> & { shipping_zone_name: string; shipping_zone_price: number }): ShippingZone {
    let savedZone: ShippingZone;

    if (z.__backendId) {
      const index = cachedShippingZones.findIndex(item => item.__backendId === z.__backendId);
      savedZone = { ...(index !== -1 ? cachedShippingZones[index] : {}), ...z } as ShippingZone;
      if (index !== -1) {
        cachedShippingZones = cachedShippingZones.map((item, idx) => idx === index ? savedZone : item);
      } else {
        cachedShippingZones = [...cachedShippingZones, savedZone];
      }
    } else {
      savedZone = {
        ...z,
        __backendId: 'ship_' + generateId(),
        type: 'shipping_zone'
      } as ShippingZone;
      cachedShippingZones = [...cachedShippingZones, savedZone];
    }

    setDoc(doc(firestoreDb, 'shipping_zones', savedZone.__backendId), savedZone);
    notifySubscribers();

    return savedZone;
  },
  deleteShippingZone(backendId: string): boolean {
    const lengthBefore = cachedShippingZones.length;
    cachedShippingZones = cachedShippingZones.filter(z => z.__backendId !== backendId);

    deleteDoc(doc(firestoreDb, 'shipping_zones', backendId));
    notifySubscribers();

    return cachedShippingZones.length < lengthBefore;
  },

  // STORE SETTINGS
  getSettings(): StoreSettings {
    return cachedSettings;
  },
  saveSettings(s: Partial<StoreSettings>): StoreSettings {
    const updated = { ...cachedSettings, ...s };
    cachedSettings = updated;

    setDoc(doc(firestoreDb, 'settings', 'sett_1'), updated);
    notifySubscribers();

    return updated;
  },

  // BANNERS
  getBanners(): Banner[] {
    return [...cachedBanners];
  },
  saveBanner(b: Partial<Banner> & { banner_position: Banner['banner_position']; banner_image_url: string }): Banner {
    let savedBanner: Banner;

    if (b.__backendId) {
      const index = cachedBanners.findIndex(item => item.__backendId === b.__backendId);
      savedBanner = { ...(index !== -1 ? cachedBanners[index] : {}), ...b } as Banner;
      if (index !== -1) {
        cachedBanners = cachedBanners.map((item, idx) => idx === index ? savedBanner : item);
      } else {
        cachedBanners = [...cachedBanners, savedBanner];
      }
    } else {
      savedBanner = {
        ...b,
        __backendId: 'ban_' + generateId(),
        type: 'banner',
        banner_enabled: b.banner_enabled !== false,
        banner_size: b.banner_size || 'rectangle',
        banner_width: b.banner_width || 0,
        banner_height: b.banner_height || 0
      } as Banner;
      cachedBanners = [...cachedBanners, savedBanner];
    }

    setDoc(doc(firestoreDb, 'banners', savedBanner.__backendId), savedBanner);
    notifySubscribers();

    return savedBanner;
  },
  deleteBanner(backendId: string): boolean {
    const lengthBefore = cachedBanners.length;
    cachedBanners = cachedBanners.filter(b => b.__backendId !== backendId);

    deleteDoc(doc(firestoreDb, 'banners', backendId));
    notifySubscribers();

    return cachedBanners.length < lengthBefore;
  },

  // ADMIN PASSWORD
  getAdminPassword(): string {
    return cachedPassword;
  },
  saveAdminPassword(password: string): void {
    cachedPassword = password;
    setDoc(doc(firestoreDb, 'admin_password', 'password_doc'), { password });
    notifySubscribers();
  },

  // PRODUCT DISPLAY ORDER
  getProductDisplayOrder(): string[] {
    return [...cachedDisplayOrder];
  },
  saveProductDisplayOrder(order: string[]): void {
    cachedDisplayOrder = [...order];
    setDoc(doc(firestoreDb, 'product_display_order', 'order_doc'), { order });
    notifySubscribers();
  },

  // REELS
  getReels(): Reel[] {
    return [...cachedReels];
  },
  saveReel(r: Partial<Reel> & { reel_url: string }): Reel {
    let savedReel: Reel;

    if (r.__backendId) {
      const index = cachedReels.findIndex(item => item.__backendId === r.__backendId);
      savedReel = { ...(index !== -1 ? cachedReels[index] : {}), ...r } as Reel;
      if (index !== -1) {
        cachedReels = cachedReels.map((item, idx) => idx === index ? savedReel : item);
      } else {
        cachedReels = [...cachedReels, savedReel];
      }
    } else {
      savedReel = {
        ...r,
        __backendId: 'reel_' + generateId(),
        type: 'reel'
      } as Reel;
      cachedReels = [...cachedReels, savedReel];
    }

    setDoc(doc(firestoreDb, 'reels', savedReel.__backendId), savedReel);
    notifySubscribers();

    return savedReel;
  },
  deleteReel(backendId: string): boolean {
    const lengthBefore = cachedReels.length;
    cachedReels = cachedReels.filter(r => r.__backendId !== backendId);

    deleteDoc(doc(firestoreDb, 'reels', backendId));
    notifySubscribers();

    return cachedReels.length < lengthBefore;
  }
};
