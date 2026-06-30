import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ArrowLeft, ShoppingBag, MapPin, Ticket, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { CartItem, Product, Coupon, ShippingZone } from '../types';
import { db } from '../db';
import { translations, formatPrice } from '../i18n';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (i: number, qty: number) => void;
  onRemoveItem: (i: number) => void;
  products: Product[];
  coupons: Coupon[];
  shippingZones: ShippingZone[];
  onOrderCompleted: () => void;
  lang: 'en' | 'ar';
  onSetLang: (lang: 'en' | 'ar') => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  products,
  coupons,
  shippingZones,
  onOrderCompleted,
  lang,
  onSetLang
}: CartDrawerProps) {
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const t = translations[lang];

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setOrderPlaced(false);
    }, 300);
  };

  // Form fields state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [stateGovernorate, setStateGovernorate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [shippingZoneName, setShippingZoneName] = useState(shippingZones[0]?.shipping_zone_name || '');

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Calculate cart subtotal
  const calcSubtotal = () => {
    let sum = 0;
    cart.forEach(item => {
      const p = products.find(pp => pp.__backendId === item.productId);
      if (!p) return;
      const price = p.discount_price > 0 && p.discount_price < p.price ? p.discount_price : p.price;
      let addonPrice = 0;
      if (item.extra) {
        const extras: { name: string; price: number }[] = JSON.parse(p.extras || '[]');
        const target = extras.find(ex => ex.name === item.extra);
        if (target) addonPrice = target.price;
      }
      sum += (price + addonPrice) * item.qty;
    });
    return sum;
  };

  const subtotal = calcSubtotal();

  // Handle Coupon Apply
  const handleApplyCoupon = () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) {
      setCouponError(t.enterCoupon);
      setAppliedCoupon(null);
      return;
    }

    const match = coupons.find(c => c.coupon_code.toUpperCase() === clean);
    if (!match) {
      setCouponError(t.couponNotFound);
      setAppliedCoupon(null);
      return;
    }

    const usageLimit = Number(match.coupon_usage_limit);
    const usageCount = Number(match.coupon_usage_count || 0);

    if (usageCount >= usageLimit) {
      setCouponError(t.couponExpired);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(match);
    setCouponError(null);
  };

  const discountAmount = appliedCoupon ? subtotal * (appliedCoupon.coupon_discount / 100) : 0;

  // Selected Shipping fee calculation
  const selectedZone = shippingZones.find(z => z.shipping_zone_name === shippingZoneName);
  const shippingFee = selectedZone ? selectedZone.shipping_zone_price : 0;

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  // Submit order placement
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Compile items for database record
    const items = cart.map(item => {
      const p = products.find(pp => pp.__backendId === item.productId);
      const price = p ? (p.discount_price > 0 && p.discount_price < p.price ? p.discount_price : p.price) : 0;
      return {
        name: p ? p.name : 'Unknown Product',
        color: item.color,
        size: item.size,
        extra: item.extra,
        qty: item.qty,
        price: price
      };
    });

    const orderPayload = {
      order_customer_name: name,
      order_email: email,
      order_phone: countryCode + phone,
      order_alt_phone: altPhone,
      order_state: stateGovernorate,
      order_address: address,
      order_items: JSON.stringify(items),
      order_total: grandTotal,
      order_status: 'pending' as const,
      order_coupon: appliedCoupon?.coupon_code || '',
      order_discount: discountAmount,
      order_shipping_zone: shippingZoneName,
      order_shipping_fee: shippingFee,
      order_notes: notes
    };

    // Save order
    const createdOrder = db.saveOrder(orderPayload);

    // Update coupon usage count if applied
    if (appliedCoupon) {
      db.saveCoupon({
        ...appliedCoupon,
        coupon_usage_count: (appliedCoupon.coupon_usage_count || 0) + 1
      });
    }

    // Deduct stock inventory for color/size variant or simple inventory
    cart.forEach(item => {
      const p = products.find(pp => pp.__backendId === item.productId);
      if (p) {
        const inventory: Record<string, number> = JSON.parse(p.inventory || '{}');
        const colorsList = JSON.parse(p.colors || '[]');
        const sizesList = JSON.parse(p.sizes || '[]');

        if (colorsList.length > 0 || sizesList.length > 0) {
          const key = `${item.color}__${item.size}`;
          if (inventory[key] !== undefined) {
            inventory[key] = Math.max(0, inventory[key] - item.qty);
          }
        } else {
          if (inventory.simple !== undefined) {
            inventory.simple = Math.max(0, inventory.simple - item.qty);
          }
        }

        db.saveProduct({
          ...p,
          inventory: JSON.stringify(inventory)
        });
      }
    });

    // Reset states
    setCheckoutMode(false);
    setName('');
    setEmail('');
    setPhone('');
    setAltPhone('');
    setStateGovernorate('');
    setAddress('');
    setNotes('');
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);

    // Trigger notification callback
    onOrderCompleted();
    setOrderPlaced(true);
  };

  const getProductImages = (p: Product) => {
    const imgs = JSON.parse(p.images || '[]');
    if (imgs.length > 0) return imgs;
    return ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100'];
  };

  // Pre-configured popular country codes list
  const countriesList = [
    { code: '+966', label: 'Saudi Arabia' },
    { code: '+971', label: 'UAE' },
    { code: '+965', label: 'Kuwait' },
    { code: '+973', label: 'Bahrain' },
    { code: '+968', label: 'Oman' },
    { code: '+974', label: 'Qatar' },
    { code: '+20', label: 'Egypt' },
    { code: '+962', label: 'Jordan' },
    { code: '+961', label: 'Lebanon' },
    { code: '+1', label: 'USA / Canada' },
    { code: '+44', label: 'United Kingdom' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Sliding Panel Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35 }}
            className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                {orderPlaced ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : checkoutMode ? (
                  <button
                    onClick={() => setCheckoutMode(false)}
                    className="p-1 hover:bg-gray-50 rounded-full transition text-gray-500"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <ShoppingBag className="w-5 h-5 text-gray-400" />
                )}
                <h3 className="font-bold text-lg text-gray-900">
                  {orderPlaced ? (lang === 'ar' ? 'تم الطلب بنجاح' : 'Order Placed') : checkoutMode ? t.checkoutDetails : `${t.yourCart} (${cart.length})`}
                </h3>
              </div>
              <button onClick={handleClose} className="p-1.5 hover:bg-gray-50 rounded-lg transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Middle Frame Scroll */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {orderPlaced ? (
                /* SUCCESS SCREEN */
                <div className="text-center py-12 space-y-6 my-auto flex flex-col justify-center items-center h-full">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-sm border border-emerald-100"
                  >
                    <CheckCircle className="w-10 h-10" />
                  </motion.div>

                  <div className="space-y-2">
                    <h2 className="font-extrabold text-2xl text-gray-900 tracking-tight">
                      {lang === 'ar' ? 'تم تقديم طلبك بنجاح.' : 'Your order has been placed successfully.'}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium px-4">
                      {lang === 'ar' 
                        ? 'تم حفظ طلبك بشكل آمن ومزامنة التفاصيل مع لوحة تحكم المتجر.' 
                        : 'Your order has been recorded securely and is immediately available in the Store Dashboard.'}
                    </p>
                  </div>

                  <div className="pt-4 w-full px-6">
                    <button
                      onClick={handleClose}
                      className="w-full bg-black text-white hover:opacity-90 py-3 px-8 rounded-full font-bold text-sm transition shadow-md"
                    >
                      {lang === 'ar' ? 'متابعة التسوق' : 'Continue Shopping'}
                    </button>
                  </div>
                </div>
              ) : !checkoutMode ? (
                /* SHOPPING CART OVERVIEW */
                cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShoppingBag className="w-12 h-12 mx-auto text-gray-300" />
                    <p className="text-gray-500 font-medium">{t.cartEmpty}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, i) => {
                      const p = products.find(pp => pp.__backendId === item.productId);
                      if (!p) return null;

                      const imgs = getProductImages(p);
                      const basePrice = p.discount_price > 0 && p.discount_price < p.price ? p.discount_price : p.price;

                      // Accessory price calculations
                      let addonCost = 0;
                      if (item.extra) {
                        const extras: { name: string; price: number }[] = JSON.parse(p.extras || '[]');
                        const target = extras.find(ex => ex.name === item.extra);
                        if (target) addonCost = target.price;
                      }

                      const lineTotal = (basePrice + addonCost) * item.qty;

                      return (
                        <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 items-start">
                          <img
                            src={imgs[0]}
                            alt={p.name}
                            className="w-16 h-16 rounded-lg object-cover bg-white flex-shrink-0 border border-gray-100"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-gray-900 truncate leading-tight">{p.name}</h4>
                            <p className="text-[10px] text-gray-400 mt-1 space-x-1">
                              {item.color && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: item.color }} />
                                  {lang === 'ar' ? 'اللون' : 'Color'}
                                </span>
                              )}
                              {item.size && <span>· {lang === 'ar' ? 'المقاس' : 'Size'}: {item.size}</span>}
                              {item.extra && <span className="text-indigo-500">· +{item.extra}</span>}
                            </p>

                            {/* Quantity selection inside cart drawer */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden select-none">
                                <button
                                  onClick={() => {
                                    if (item.qty > 1) onUpdateQty(i, item.qty - 1);
                                    else onRemoveItem(i);
                                  }}
                                  className="px-2 py-0.5 hover:bg-gray-50 text-gray-500 font-extrabold text-xs transition"
                                >
                                  −
                                </button>
                                <span className="px-2 text-xs font-bold text-gray-900 min-w-6 text-center">
                                  {item.qty}
                                </span>
                                <button
                                  onClick={() => onUpdateQty(i, item.qty + 1)}
                                  className="px-2 py-0.5 hover:bg-gray-50 text-gray-500 font-extrabold text-xs transition"
                                >
                                  +
                                </button>
                              </div>

                              <span className="font-extrabold text-xs text-gray-900">
                                {formatPrice(lineTotal, lang)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* CHECKOUT FORM VIEW */
                <form id="drawer-checkout-form" onSubmit={handleSubmitOrder} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.fullName} *</label>
                    <input
                      type="text"
                      required
                      placeholder={t.fullNamePlaceholder}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.whatsappPhone} *</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none text-xs text-gray-700 font-semibold"
                      >
                        {countriesList.map(item => (
                          <option key={item.code} value={item.code}>
                            {item.code} {item.label.slice(0, 3)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        placeholder="505555555"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.alternativePhone}</label>
                    <input
                      type="tel"
                      placeholder={t.alternativePhonePlaceholder}
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.governorateState}</label>
                    <input
                      type="text"
                      required
                      placeholder={t.governorateStatePlaceholder}
                      value={stateGovernorate}
                      onChange={(e) => setStateGovernorate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.shippingAddress} *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder={t.shippingAddressPlaceholder}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.orderNotes}</label>
                    <textarea
                      rows={2}
                      placeholder={t.orderNotesPlaceholder}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.emailAddress} ({lang === 'ar' ? 'اختياري' : 'Optional'})</label>
                    <input
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black text-gray-950 font-medium"
                    />
                  </div>

                  {shippingZones.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">{t.shippingZone} *</label>
                      <select
                        value={shippingZoneName}
                        onChange={(e) => setShippingZoneName(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl text-gray-800 font-semibold"
                      >
                        {shippingZones.map(zone => (
                          <option key={zone.__backendId} value={zone.shipping_zone_name}>
                            {zone.shipping_zone_name} - {formatPrice(zone.shipping_zone_price, lang)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Coupon Codes applicator */}
                  <div className="border-t border-gray-100 pt-4 mt-6">
                    <label className="text-xs font-bold text-gray-500 block mb-1">{t.couponCode}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t.couponPlaceholder}
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setCouponError(null);
                        }}
                        className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-black uppercase font-mono tracking-wider font-semibold"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-85 transition whitespace-nowrap"
                      >
                        {t.apply}
                      </button>
                    </div>

                    {/* Coupon status messages warnings */}
                    {couponError && (
                      <div className="mt-2.5 bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] text-rose-600 font-medium leading-relaxed">{couponError}</span>
                      </div>
                    )}
                    {appliedCoupon && (
                      <div className="mt-2.5 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <p className="text-emerald-700 font-bold">{t.couponApplied} {appliedCoupon.coupon_code}!</p>
                          <p className="text-emerald-600 font-medium mt-0.5">{lang === 'ar' ? 'تم حفظ نسبة خصم ' : 'Discount percentage '}{appliedCoupon.coupon_discount}% {t.couponDiscountSaved}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Bottom calculation billing card and CTA triggers */}
            {!orderPlaced && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <div className="space-y-2 mb-4 text-xs font-medium text-gray-600">
                  <div className="flex justify-between">
                    <span>{t.subtotal}</span>
                    <span className="text-gray-900 font-bold">{formatPrice(subtotal, lang)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600">
                      <span>{t.discount} ({appliedCoupon.coupon_discount}%)</span>
                      <span>-{formatPrice(discountAmount, lang)}</span>
                    </div>
                  )}
                  {checkoutMode && shippingFee > 0 && (
                    <div className="flex justify-between">
                      <span>{t.shippingCharges}</span>
                      <span className="text-gray-900 font-bold">+{formatPrice(shippingFee, lang)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                    <span>{t.grandTotal}</span>
                    <span>{formatPrice(grandTotal, lang)}</span>
                  </div>
                </div>

                {!checkoutMode ? (
                  <button
                    disabled={cart.length === 0}
                    onClick={() => setCheckoutMode(true)}
                    className={`w-full py-3.5 rounded-full font-bold text-sm transition flex items-center justify-center gap-1.5 shadow-sm ${
                      cart.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-black text-white hover:opacity-90'
                    }`}
                  >
                    {t.proceedToCheckout}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="drawer-checkout-form"
                    className="w-full bg-black hover:opacity-90 text-white py-3.5 rounded-full font-bold text-sm transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {t.placeOrder}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
