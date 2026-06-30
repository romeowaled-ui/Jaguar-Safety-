import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Product, Order, Coupon, ShippingZone, StoreSettings, Banner, CartItem } from './types';
import { db } from './db';
import { translations } from './i18n';
import Storefront from './components/Storefront';
import ProductPage from './components/ProductPage';
import AdminPanel from './components/AdminPanel';
import CartDrawer from './components/CartDrawer';

export default function App() {
  const [currentView, setCurrentView] = useState<'store' | 'product' | 'admin'>('store');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [lang, setLang] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('pro_shop_lang') as 'en' | 'ar') || 'en';
  });

  const handleSetLang = (newLang: 'en' | 'ar') => {
    setLang(newLang);
    localStorage.setItem('pro_shop_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang];

  // Database collections states
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(db.getSettings());

  // Administrative login parameters
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // App-wide toasts
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Sync collections with DB
  const refreshAllData = () => {
    setProducts(db.getProducts());
    setOrders(db.getOrders());
    setCoupons(db.getCoupons());
    setShippingZones(db.getShippingZones());
    setBanners(db.getBanners());
    setStoreSettings(db.getSettings());
  };

  // Initial Load
  useEffect(() => {
    refreshAllData();
    if (typeof db.subscribe === 'function') {
      const unsubscribe = db.subscribe(() => {
        refreshAllData();
      });
      return unsubscribe;
    }
  }, []);

  // Cart operations
  const handleAddToCart = (
    productId: string,
    color: string,
    size: string,
    extra: string,
    qty: number,
    buyNow: boolean
  ) => {
    const existingIdx = cart.findIndex(
      item =>
        item.productId === productId &&
        item.color === color &&
        item.size === size &&
        item.extra === extra
    );

    const nextCart = [...cart];
    if (existingIdx >= 0) {
      nextCart[existingIdx].qty += qty;
    } else {
      nextCart.push({ productId, color, size, extra, qty });
    }

    setCart(nextCart);
    triggerToast(t.addedToCart);

    if (buyNow) {
      setShowCart(true);
    }
  };

  const handleUpdateCartQty = (idx: number, qty: number) => {
    const nextCart = [...cart];
    if (qty > 0) {
      nextCart[idx].qty = qty;
    } else {
      nextCart.splice(idx, 1);
    }
    setCart(nextCart);
  };

  const handleRemoveCartItem = (idx: number) => {
    const nextCart = [...cart];
    nextCart.splice(idx, 1);
    setCart(nextCart);
    triggerToast(t.removedFromCart);
  };

  // Admin access validation
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = db.getAdminPassword();

    if (adminName.trim().toLowerCase() === 'admin' && adminPassword === correctPassword) {
      setAdminAuthenticated(true);
      setShowAdminLogin(false);
      setCurrentView('admin');
      setAdminName('');
      setAdminPassword('');
      setAdminLoginError(null);
      triggerToast('Welcome back, Admin!');
    } else {
      setAdminLoginError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 bg-black text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-medium text-sm text-center"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE VIEW ROUTER */}
      {currentView === 'admin' && adminAuthenticated ? (
        <AdminPanel
          onBackToStore={() => setCurrentView('store')}
          products={products}
          orders={orders}
          coupons={coupons}
          shippingZones={shippingZones}
          banners={banners}
          storeSettings={storeSettings}
          onRefreshData={refreshAllData}
          lang={lang}
          onSetLang={handleSetLang}
        />
      ) : currentView === 'product' && activeProduct ? (
        <ProductPage
          product={activeProduct}
          onBackToStore={() => {
            setCurrentView('store');
            setActiveProduct(null);
          }}
          onAddToCart={handleAddToCart}
          onOpenCart={() => setShowCart(true)}
          cartCount={cart.length}
          storeSettings={storeSettings}
          lang={lang}
          onSetLang={handleSetLang}
        />
      ) : (
        <Storefront
          products={products}
          banners={banners}
          storeSettings={storeSettings}
          onSelectProduct={(p) => {
            setActiveProduct(p);
            setCurrentView('product');
          }}
          onOpenCart={() => setShowCart(true)}
          onOpenAdmin={() => {
            if (adminAuthenticated) {
              setCurrentView('admin');
            } else {
              setShowAdminLogin(true);
            }
          }}
          cartCount={cart.length}
          lang={lang}
          onSetLang={handleSetLang}
        />
      )}

      {/* SHOPPING CART & CHECKOUT SLIDER */}
      <CartDrawer
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        products={products}
        coupons={coupons}
        shippingZones={shippingZones}
        onOrderCompleted={() => {
          setCart([]);
          refreshAllData();
        }}
        lang={lang}
        onSetLang={handleSetLang}
      />

      {/* MODAL OVERLAY: STANDARD ADMIN LOCK */}
      <AnimatePresence>
        {showAdminLogin && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
            onClick={() => {
              setShowAdminLogin(false);
              setAdminLoginError(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-extrabold text-xl mb-1 flex items-center gap-2 text-black">
                <Lock className="w-5 h-5 text-gray-700" />
                Administrative Access
              </h3>
              <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
                Enter your security keys to access the storefront metrics and inventories.
              </p>

              <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => {
                      setAdminName(e.target.value);
                      setAdminLoginError(null);
                    }}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    placeholder="e.g. admin"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Security Password</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminLoginError(null);
                    }}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-mono"
                    placeholder="••••••••"
                  />
                </div>

                {adminLoginError && (
                  <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] text-rose-600 font-bold leading-tight">{adminLoginError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminLoginError(null);
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-xs transition text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-xs transition shadow-md"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
