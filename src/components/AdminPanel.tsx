import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package, ShoppingCart, Ticket, Truck, Image as ImageIcon, Sliders,
  ArrowLeft, Plus, Edit, Trash2, GripVertical, CheckCircle, X,
  User, Phone, MapPin, Settings, AlertCircle, Lock, Film
} from 'lucide-react';
import { Product, Order, Coupon, ShippingZone, StoreSettings, Banner, Reel } from '../types';
import { db } from '../db';
import { translations, formatPrice } from '../i18n';

interface AdminPanelProps {
  onBackToStore: () => void;
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  shippingZones: ShippingZone[];
  banners: Banner[];
  storeSettings: StoreSettings;
  onRefreshData: () => void;
  lang: 'en' | 'ar';
  onSetLang: (lang: 'en' | 'ar') => void;
}

export default function AdminPanel({
  onBackToStore,
  products,
  orders,
  coupons,
  shippingZones,
  banners,
  storeSettings,
  onRefreshData,
  lang,
  onSetLang
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'coupons' | 'shipping' | 'banners' | 'reels' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [editingShippingZone, setEditingShippingZone] = useState<Partial<ShippingZone> | null>(null);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [editingReel, setEditingReel] = useState<Partial<Reel> | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);

  const t = translations[lang];

  // Auth States
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [settingsCreds, setSettingsCreds] = useState({ name: '', password: '' });
  const [showSettingsLogin, setShowSettingsLogin] = useState(false);

  const [passwordChange, setPasswordChange] = useState({ current: '', new: '', confirm: '' });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'product' | 'order' | 'coupon' | 'shipping_zone' | 'banner' | 'reel' | 'purge' } | null>(null);

  // Toast State
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Reordering States
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]);

  useEffect(() => {
    setDisplayOrder(db.getProductDisplayOrder());
  }, [products]);

  const handleProductDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const items = [...displayOrder];
    const draggedIdx = items.indexOf(draggedId);
    const targetIdx = items.indexOf(targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;
    items.splice(draggedIdx, 1);
    items.splice(targetIdx, 0, draggedId);

    setDisplayOrder(items);
    db.saveProductDisplayOrder(items);
    triggerToast('Products reordered successfully!');
    onRefreshData();
  };

  // Handle Deletions
  const handleDelete = () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    let isOk = false;

    if (type === 'purge') {
      db.purgeStoreContent();
      triggerToast('All products, banners, and reels deleted successfully!');
      onRefreshData();
      setDeleteConfirm(null);
      return;
    }

    if (type === 'product') {
      isOk = db.deleteProduct(id);
    } else if (type === 'order') {
      isOk = db.deleteOrder(id);
      if (orderDetail?.__backendId === id) setOrderDetail(null);
    } else if (type === 'coupon') {
      isOk = db.deleteCoupon(id);
    } else if (type === 'shipping_zone') {
      isOk = db.deleteShippingZone(id);
    } else if (type === 'banner') {
      isOk = db.deleteBanner(id);
    } else if (type === 'reel') {
      isOk = db.deleteReel(id);
    }

    if (isOk) {
      triggerToast(`${type.replace('_', ' ')} deleted successfully!`);
      onRefreshData();
    } else {
      triggerToast('Error deleting item.');
    }
    setDeleteConfirm(null);
  };

  // Status modifiers for orders
  const handleUpdateOrderStatus = (orderId: string, status: Order['order_status']) => {
    const updated = db.updateOrderStatus(orderId, status);
    if (updated) {
      triggerToast(`Order status updated to ${status}!`);
      if (orderDetail?.__backendId === orderId) {
        setOrderDetail(updated);
      }
      onRefreshData();
    }
  };

  // Arabic WhatsApp Notification Generator
  const sendWhatsAppNotification = (order: Order) => {
    const items: any[] = JSON.parse(order.order_items || '[]');
    const storeName = storeSettings.settings_store_name || 'Pro Shop';

    let itemsList = '';
    items.forEach(item => {
      itemsList += `• ${item.name} ${item.color ? `(${item.color})` : ''} ${item.size ? `[${item.size}]` : ''} × ${item.qty} - ${formatPrice(item.price * item.qty, 'ar')}\n`;
    });

    let message = `السلام عليكم ورحمة الله وبركاته ${order.order_customer_name}! 👋\n\n`;
    message += `شكراً لك على طلبك من متجر ${storeName}!\n\n`;
    message += `📦 تفاصيل الطلب\n`;
    message += `رقم الطلب: ${order.__backendId.slice(0, 8)}\n\n`;
    message += `📋 المنتجات:\n${itemsList}`;

    if (order.order_coupon) {
      message += `\n💰 كود الخصم (${order.order_coupon}): -${formatPrice(Number(order.order_discount || 0), 'ar')}\n`;
    }
    if (order.order_shipping_fee) {
      message += `📍 الشحن (${order.order_shipping_zone}): ${formatPrice(Number(order.order_shipping_fee), 'ar')}\n`;
    }

    message += `\n💵 المجموع الكلي: ${formatPrice(Number(order.order_total), 'ar')}\n\n`;
    message += `📍 عنوان التوصيل:\n${order.order_address}\n\n`;
    message += `✅ جاري معالجة طلبك وسيتم إرسال تحديثات قريباً!\n`;
    message += `إذا كان لديك أي استفسارات، لا تتردد في التواصل معنا.\n\n`;
    message += `شكراً لك! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    const cleanedPhone = order.order_phone.replace(/[^0-9+]/g, '');
    const phoneWithPlus = cleanedPhone.startsWith('+') ? cleanedPhone.slice(1) : cleanedPhone;

    const whatsappUrl = `https://wa.me/${phoneWithPlus}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    triggerToast('Opening WhatsApp...');
  };

  const handleSettingsLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settingsCreds.name.trim().toLowerCase() === 'ramadan' && settingsCreds.password === 'Ro8995') {
      setSettingsUnlocked(true);
      setShowSettingsLogin(false);
      triggerToast('Store settings unlocked successfully!');
    } else {
      triggerToast('Invalid Store Settings credentials.');
    }
  };

  const handleSaveStoreName = (e: React.FormEvent) => {
    e.preventDefault();
    const nameInput = (document.getElementById('settings_name') as HTMLInputElement).value.trim();
    if (!nameInput) return;
    db.saveSettings({ settings_store_name: nameInput });
    triggerToast('Store name saved!');
    onRefreshData();
  };

  const handleSaveLogo = (e: React.FormEvent) => {
    e.preventDefault();
    const logoUrl = (document.getElementById('settings_logo_url') as HTMLInputElement).value.trim();
    db.saveSettings({ settings_admin_logo_url: logoUrl });
    triggerToast('Store logo updated!');
    onRefreshData();
  };

  const handleSaveNameImage = (e: React.FormEvent) => {
    e.preventDefault();
    const imageInput = (document.getElementById('settings_name_image') as HTMLInputElement).value.trim();
    db.saveSettings({ settings_store_name_image_url: imageInput });
    triggerToast('Branding name image updated!');
    onRefreshData();
  };

  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    const facebook = (document.getElementById('social_facebook') as HTMLInputElement).value.trim();
    const instagram = (document.getElementById('social_instagram') as HTMLInputElement).value.trim();
    const tiktok = (document.getElementById('social_tiktok') as HTMLInputElement).value.trim();
    const twitter = (document.getElementById('social_twitter') as HTMLInputElement).value.trim();
    const whatsapp = (document.getElementById('social_whatsapp') as HTMLInputElement).value.trim();

    db.saveSettings({
      social_facebook: facebook,
      social_instagram: instagram,
      social_tiktok: tiktok,
      social_twitter: twitter,
      social_whatsapp: whatsapp
    });
    triggerToast('Social links saved!');
    onRefreshData();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currentPass = db.getAdminPassword();
    if (passwordChange.current !== currentPass) {
      triggerToast('Current password is incorrect.');
      return;
    }
    if (passwordChange.new.length < 6) {
      triggerToast('New password must be at least 6 characters.');
      return;
    }
    if (passwordChange.new !== passwordChange.confirm) {
      triggerToast('New passwords do not match.');
      return;
    }

    db.saveAdminPassword(passwordChange.new);
    triggerToast('Admin password changed successfully!');
    setPasswordChange({ current: '', new: '', confirm: '' });
  };

  // Category unique values helper
  const getUniqueCategories = () => {
    const cats = new Set<string>();
    products.forEach(p => p.category && cats.add(p.category));
    return Array.from(cats);
  };

  const categories = getUniqueCategories();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-16 md:w-64 bg-white border-r border-gray-100 flex flex-col justify-between shadow-sm z-10">
        <div>
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <button
              onClick={onBackToStore}
              className="flex items-center gap-2 text-gray-500 hover:text-black transition text-sm font-medium w-full"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden md:inline">Back to Store</span>
            </button>
          </div>
          <nav className="p-3 space-y-1.5 flex-1">
            {[
              { id: 'products', label: 'Products', icon: Package, count: products.length },
              { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.filter(o => o.order_status === 'pending').length, countColor: 'bg-red-500 text-white' },
              { id: 'coupons', label: 'Coupons', icon: Ticket, count: coupons.length },
              { id: 'shipping', label: 'Shipping', icon: Truck, count: shippingZones.length },
              { id: 'banners', label: 'Banners', icon: ImageIcon, count: banners.length },
              { id: 'reels', label: 'Reels', icon: Film, count: db.getReels().length }
            ].map((tab) => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setEditingProduct(null);
                    setEditingCoupon(null);
                    setEditingShippingZone(null);
                    setEditingBanner(null);
                    setOrderDetail(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition text-left relative font-medium text-sm ${
                    activeTab === tab.id
                      ? 'bg-black text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                  }`}
                >
                  <IconComp className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`hidden md:inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ml-auto ${
                      tab.countColor || 'bg-gray-100 text-gray-800'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-gray-50">
          <button
            onClick={() => {
              setActiveTab('settings');
              setEditingProduct(null);
              setEditingCoupon(null);
              setEditingShippingZone(null);
              setEditingBanner(null);
              setOrderDetail(null);
              if (!settingsUnlocked) {
                setShowSettingsLogin(true);
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition text-left font-medium text-sm ${
              activeTab === 'settings'
                ? 'bg-black text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-black'
            }`}
          >
            <Sliders className="w-5 h-5 flex-shrink-0" />
            <span className="hidden md:inline">Store Settings</span>
            {!settingsUnlocked && <Lock className="w-3.5 h-3.5 ml-auto text-gray-400 hidden md:block" />}
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50 flex flex-col">
        {/* Header bar */}
        <header className="bg-white border-b border-gray-100 py-4 px-6 flex items-center justify-between flex-shrink-0 shadow-xs">
          <h2 className="text-lg font-bold capitalize flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            Admin Panel / {activeTab}
          </h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-mono">
            Secure Session
          </span>
        </header>

        <div className="p-6 flex-1">
          {/* TOAST NOTIFICATION */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 right-6 bg-black text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-medium text-sm"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB PRODUCTS */}
          {activeTab === 'products' && (
            <div className="max-w-5xl mx-auto">
              {editingProduct ? (
                /* PRODUCT ADD / EDIT WORKSPACE */
                <ProductForm
                  product={editingProduct}
                  onCancel={() => setEditingProduct(null)}
                  onSave={() => {
                    setEditingProduct(null);
                    onRefreshData();
                    triggerToast('Product saved successfully!');
                  }}
                  categories={categories}
                />
              ) : (
                /* PRODUCTS LISTING GRID WITH DRAG TO SORT */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold">Catalog Products</h3>
                      <p className="text-xs text-gray-500 mt-1">Drag handles to rearrange order on storefront.</p>
                    </div>
                    <button
                      onClick={() => setEditingProduct({})}
                      className="bg-black hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> Add New Product
                    </button>
                  </div>

                  {products.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Your store has no products yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayOrder
                        .map(id => products.find(p => p.__backendId === id))
                        .filter((p): p is Product => p !== undefined)
                        .map((p, idx) => {
                          const imgs = JSON.parse(p.images || '[]');
                          const price = Number(p.price);
                          const dPrice = Number(p.discount_price);
                          const hasDiscount = dPrice > 0 && dPrice < price;

                          return (
                            <div
                              key={p.__backendId}
                              draggable
                              onDragStart={() => setDraggedId(p.__backendId)}
                              onDragEnd={() => {
                                setDraggedId(null);
                                setDragOverId(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverId(p.__backendId);
                              }}
                              onDragLeave={() => {
                                if (dragOverId === p.__backendId) setDragOverId(null);
                              }}
                              onDrop={() => handleProductDrop(p.__backendId)}
                              className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-move ${
                                dragOverId === p.__backendId
                                  ? 'border-black bg-gray-50 shadow-sm'
                                  : 'border-gray-100 bg-white hover:shadow-xs'
                              } ${draggedId === p.__backendId ? 'opacity-40' : ''}`}
                            >
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <GripVertical className="w-4 h-4 flex-shrink-0" />
                                <span className="font-mono text-xs font-bold">#{idx + 1}</span>
                              </div>

                              <img
                                src={imgs[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100'}
                                alt={p.name}
                                className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate">{p.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {hasDiscount ? (
                                    <>
                                      <span className="text-xs font-extrabold text-black">{formatPrice(dPrice, lang)}</span>
                                      <span className="text-xs text-gray-400 line-through">{formatPrice(price, lang)}</span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-800">{formatPrice(price, lang)}</span>
                                  )}
                                  {p.category && (
                                    <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                      {p.category}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => setEditingProduct(p)}
                                  className="p-2 bg-gray-50 hover:bg-black hover:text-white rounded-lg transition"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ id: p.__backendId, type: 'product' })}
                                  className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB ORDERS */}
          {activeTab === 'orders' && (
            <div className="max-w-5xl mx-auto">
              {orderDetail ? (
                /* ORDER DETAIL SUMMARY */
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => setOrderDetail(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold">Order Breakdown</h3>
                    <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-mono font-medium ml-auto">
                      ID: {orderDetail.__backendId.slice(0, 8)}
                    </span>
                  </div>

                  {/* Status selection slider */}
                  <div className="mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Order Status</h4>
                    <div className="flex gap-2 flex-wrap">
                      {(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as Order['order_status'][]).map(st => {
                        const bgColors = {
                          pending: 'bg-amber-500 text-white',
                          confirmed: 'bg-blue-500 text-white',
                          shipped: 'bg-indigo-500 text-white',
                          delivered: 'bg-emerald-500 text-white',
                          cancelled: 'bg-rose-500 text-white'
                        };

                        const isActive = orderDetail.order_status === st;

                        return (
                          <button
                            key={st}
                            onClick={() => handleUpdateOrderStatus(orderDetail.__backendId, st)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition ${
                              isActive ? bgColors[st] : 'bg-white hover:bg-gray-100 border border-gray-100 text-gray-700'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs">
                      <h4 className="text-xs text-gray-400 font-bold uppercase mb-3">Customer Details</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900">{orderDetail.order_customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-800">{orderDetail.order_phone}</span>
                        </div>
                        {orderDetail.order_alt_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 text-xs">Alt Phone: {orderDetail.order_alt_phone}</span>
                          </div>
                        )}
                        {orderDetail.order_email && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 font-bold text-xs flex-shrink-0">@</span>
                            <span className="text-gray-600 text-xs">{orderDetail.order_email}</span>
                          </div>
                        )}
                        {orderDetail.order_state && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-wider">State</span>
                            <span className="font-medium text-gray-800 text-xs">{orderDetail.order_state}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                          <span className="text-gray-800 text-xs leading-relaxed">{orderDetail.order_address}</span>
                        </div>
                        {orderDetail.order_notes && (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-100/60 text-amber-900 text-xs rounded-xl">
                            <span className="font-bold block mb-1">Order Notes:</span>
                            <p className="italic leading-relaxed">{orderDetail.order_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs text-gray-400 font-bold uppercase mb-3 font-sans">Notification</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          Launch the pre-formatted WhatsApp interface to notify the buyer in Arabic about order placement.
                        </p>
                      </div>
                      <button
                        onClick={() => sendWhatsAppNotification(orderDetail)}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12.004 2c-5.51 0-9.99 4.49-9.99 10 0 1.91.53 3.69 1.46 5.23l-1.46 5.34 5.48-1.43c1.48.81 3.16 1.28 4.96 1.28 5.51 0 10-4.49 10-10s-4.49-10-10-10zm5.47 14.38c-.3.15-1.76.87-2.03.97-.27.1-.47.15-.67-.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
                        </svg>
                        ارسال التفاصيل عبر الواتساب
                      </button>
                    </div>
                  </div>

                  {/* Order Items Table */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden mb-6">
                    <div className="bg-gray-50 px-4 py-3 text-xs font-bold uppercase text-gray-500 border-b border-gray-100">
                      Ordered Products
                    </div>
                    <div className="divide-y divide-gray-50">
                      {(JSON.parse(orderDetail.order_items || '[]') as any[]).map((item, i) => (
                        <div key={i} className="px-4 py-4 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.color && (
                                <span className="inline-flex items-center gap-1 mr-2">
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: item.color }} />
                                  Color
                                </span>
                              )}
                              {item.size && <span className="mr-2">Size: {item.size}</span>}
                              {item.extra && <span className="text-indigo-500 font-medium">+ {item.extra}</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              {formatPrice(item.price * item.qty, lang)}
                            </span>
                            <span className="text-xs text-gray-400 block mt-0.5">
                              Qty: {item.qty}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accounting list */}
                  <div className="w-full md:w-80 ml-auto space-y-2 text-sm border-t border-gray-100 pt-4">
                    {orderDetail.order_coupon && (
                      <div className="flex justify-between text-gray-500">
                        <span>Applied Coupon ({orderDetail.order_coupon})</span>
                        <span className="text-emerald-500">-{formatPrice(Number(orderDetail.order_discount || 0), lang)}</span>
                      </div>
                    )}
                    {orderDetail.order_shipping_fee && (
                      <div className="flex justify-between text-gray-500">
                        <span>Shipping ({orderDetail.order_shipping_zone})</span>
                        <span>+{formatPrice(Number(orderDetail.order_shipping_fee), lang)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-100">
                      <span>Total Amount Paid</span>
                      <span>{formatPrice(Number(orderDetail.order_total), lang)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ORDERS OVERVIEW LIST */
                <div>
                  <h3 className="text-xl font-bold mb-6">Store Purchase Orders</h3>

                  {orders.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Your store has received no orders yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...orders]
                        .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
                        .map(order => {
                          const itemsCount = JSON.parse(order.order_items || '[]').length;
                          const dateString = new Date(order.order_date).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });

                          const statusStyles = {
                            pending: 'bg-amber-100 text-amber-700 border-amber-200',
                            confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
                            shipped: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                            delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            cancelled: 'bg-rose-100 text-rose-700 border-rose-200'
                          };

                          return (
                            <div
                              key={order.__backendId}
                              onClick={() => setOrderDetail(order)}
                              className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-xs transition cursor-pointer flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="font-bold text-sm text-gray-900">
                                    {order.order_customer_name}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusStyles[order.order_status]}`}>
                                    {order.order_status}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                  {itemsCount} {itemsCount === 1 ? 'item' : 'items'} · Registered on {dateString}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 flex-shrink-0">
                                <span className="font-extrabold text-sm text-gray-900">
                                  {formatPrice(Number(order.order_total), lang)}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({ id: order.__backendId, type: 'order' });
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB COUPONS */}
          {activeTab === 'coupons' && (
            <div className="max-w-4xl mx-auto">
              {editingCoupon ? (
                /* COUPON FORM PANEL */
                <CouponForm
                  coupon={editingCoupon}
                  onCancel={() => setEditingCoupon(null)}
                  onSave={() => {
                    setEditingCoupon(null);
                    onRefreshData();
                    triggerToast('Coupon discount saved!');
                  }}
                />
              ) : (
                /* COUPON GRID */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Discount Coupons</h3>
                    <button
                      onClick={() => setEditingCoupon({})}
                      className="bg-black hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> Add Coupon
                    </button>
                  </div>

                  {coupons.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <Ticket className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No coupons exist yet.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {coupons.map(coupon => {
                        const usageLimit = Number(coupon.coupon_usage_limit);
                        const usageCount = Number(coupon.coupon_usage_count || 0);
                        const isExpired = usageCount >= usageLimit;

                        return (
                          <div
                            key={coupon.__backendId}
                            className="bg-white border border-gray-100 p-5 rounded-2xl flex flex-col justify-between shadow-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-base font-extrabold text-black tracking-wider bg-gray-100 px-3 py-1 rounded-md">
                                  {coupon.coupon_code}
                                </span>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                  {isExpired ? 'Fully Redeemed' : 'Active'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 font-bold mb-3 mt-1">
                                {coupon.coupon_discount}% off store subtotal
                              </p>
                              <p className="text-xs text-gray-500">
                                Redemptions: <span className="font-bold text-gray-900">{usageCount} / {usageLimit}</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-gray-50 pt-4 mt-4">
                              <button
                                onClick={() => setEditingCoupon(coupon)}
                                className="p-2 bg-gray-50 hover:bg-black hover:text-white rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ id: coupon.__backendId, type: 'coupon' })}
                                className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB SHIPPING */}
          {activeTab === 'shipping' && (
            <div className="max-w-4xl mx-auto">
              {editingShippingZone ? (
                /* SHIPPING ZONE FORM */
                <ShippingZoneForm
                  zone={editingShippingZone}
                  onCancel={() => setEditingShippingZone(null)}
                  onSave={() => {
                    setEditingShippingZone(null);
                    onRefreshData();
                    triggerToast('Shipping Zone saved!');
                  }}
                />
              ) : (
                /* LIST OF ZONES */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Shipping Zones</h3>
                    <button
                      onClick={() => setEditingShippingZone({})}
                      className="bg-black hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> Add Shipping Zone
                    </button>
                  </div>

                  {shippingZones.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No shipping zones available yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippingZones.map(zone => (
                        <div
                          key={zone.__backendId}
                          className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">{zone.shipping_zone_name}</h4>
                            <p className="text-xs text-gray-500 mt-1">
                              Fixed Shipping Cost: <span className="font-extrabold text-gray-900">{formatPrice(Number(zone.shipping_zone_price), lang)}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setEditingShippingZone(zone)}
                              className="p-2 bg-gray-50 hover:bg-black hover:text-white rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ id: zone.__backendId, type: 'shipping_zone' })}
                              className="p-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB BANNERS */}
          {activeTab === 'banners' && (
            <div className="max-w-4xl mx-auto">
              {editingBanner ? (
                /* BANNER SLIDESHOW FORM */
                <BannerForm
                  banner={editingBanner}
                  onCancel={() => setEditingBanner(null)}
                  onSave={() => {
                    setEditingBanner(null);
                    onRefreshData();
                    triggerToast('Promo Banner configured!');
                  }}
                />
              ) : (
                /* BANNERS LISTING */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Promo Slides &amp; Banners</h3>
                    <button
                      onClick={() => setEditingBanner({})}
                      className="bg-black hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> Create Banner
                    </button>
                  </div>

                  {banners.length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">Your website has no banners configured yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {banners.map(banner => {
                        const positionLabels = {
                          top: 'Top of Page Header',
                          middle: 'Middle Feed Segment',
                          before_last: 'Segment Before Footer',
                          bottom: 'Page Footer Terminal'
                        };

                        return (
                          <div
                            key={banner.__backendId}
                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-4 items-center"
                          >
                            <img
                              src={banner.banner_image_url}
                              alt="Banner placeholder"
                              className="w-full md:w-36 h-20 rounded-lg object-cover bg-gray-100 flex-shrink-0 border border-gray-100"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="font-bold text-sm text-gray-900">
                                  {positionLabels[banner.banner_position]}
                                </h4>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  banner.banner_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {banner.banner_enabled ? 'Active Visible' : 'Disabled'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{banner.banner_image_url}</p>
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                              <button
                                onClick={() => setEditingBanner(banner)}
                                className="p-2.5 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ id: banner.__backendId, type: 'banner' })}
                                className="p-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB REELS */}
          {activeTab === 'reels' && (
            <div className="max-w-4xl mx-auto">
              {editingReel ? (
                /* REEL FORM */
                <ReelForm
                  reel={editingReel}
                  onCancel={() => setEditingReel(null)}
                  onSave={() => {
                    setEditingReel(null);
                    onRefreshData();
                    triggerToast(t.saveReel || 'Reel saved!');
                  }}
                  lang={lang}
                />
              ) : (
                /* REELS LISTING */
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">{t.reelsList || 'Reels Showcase List'}</h3>
                    <button
                      onClick={() => setEditingReel({})}
                      className="bg-black hover:opacity-90 text-white px-5 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" /> {t.addReel || 'Add Reel'}
                    </button>
                  </div>

                  {db.getReels().length === 0 ? (
                    <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-xs">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">{t.noReels || 'No reels configured yet.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {db.getReels().map(reel => (
                        <div
                          key={reel.__backendId}
                          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col justify-between"
                        >
                          <div className="aspect-[9/16] bg-black relative">
                            <video
                              src={reel.reel_url}
                              className="w-full h-full object-cover"
                              controls
                              playsInline
                              loop
                              muted
                              preload="metadata"
                            />
                            {(reel.reel_title || reel.reel_description) && (
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                <h4 className="font-bold text-xs truncate">{reel.reel_title || 'Untitled'}</h4>
                                <p className="text-[10px] text-gray-300 line-clamp-2 mt-1">{reel.reel_description}</p>
                              </div>
                            )}
                          </div>

                          <div className="p-4 flex items-center justify-between border-t border-gray-50 bg-gray-50/50">
                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">
                              {reel.reel_url}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingReel(reel)}
                                className="p-2 bg-white border border-gray-100 hover:bg-black hover:text-white rounded-xl transition shadow-xs"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ id: reel.__backendId, type: 'reel' })}
                                className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition border border-rose-100 shadow-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB SETTINGS (SECURED BY UNLOCK CREDENTIALS) */}
          {activeTab === 'settings' && settingsUnlocked && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Store Name Branding */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="font-bold text-base mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-black rounded-full" />
                  Store Brand Name
                </h3>
                <form onSubmit={handleSaveStoreName} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Settings Store Name *</label>
                    <input
                      id="settings_name"
                      type="text"
                      required
                      defaultValue={storeSettings.settings_store_name || ''}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition"
                  >
                    Save Brand Name
                  </button>
                </form>
              </div>

              {/* Logo Settings */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="font-bold text-base mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-black rounded-full" />
                  Header Brand Logo Image
                </h3>
                {storeSettings.settings_admin_logo_url && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                    <img
                      src={storeSettings.settings_admin_logo_url}
                      alt="Brand Header Logo"
                      className="h-10 mx-auto object-contain"
                    />
                  </div>
                )}
                <form onSubmit={handleSaveLogo} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Direct Logo URL</label>
                    <input
                      id="settings_logo_url"
                      type="url"
                      defaultValue={storeSettings.settings_admin_logo_url || ''}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block leading-relaxed">
                      Accepts standard direct web image URLs. Displayed adjacent to the brand title inside the header.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition"
                    >
                      Save Logo URL
                    </button>
                    {storeSettings.settings_admin_logo_url && (
                      <button
                        type="button"
                        onClick={() => {
                          db.saveSettings({ settings_admin_logo_url: '' });
                          triggerToast('Logo URL cleared.');
                          onRefreshData();
                        }}
                        className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-full text-xs font-bold transition"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Store Title Image Replace */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="font-bold text-base mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-black rounded-full" />
                  Header Title Image Override
                </h3>
                {storeSettings.settings_store_name_image_url && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                    <img
                      src={storeSettings.settings_store_name_image_url}
                      alt="Brand Image Overlay"
                      className="h-12 mx-auto object-contain"
                    />
                  </div>
                )}
                <form onSubmit={handleSaveNameImage} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Direct Image Name URL</label>
                    <input
                      id="settings_name_image"
                      type="url"
                      defaultValue={storeSettings.settings_store_name_image_url || ''}
                      placeholder="https://example.com/brand-text.png"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block leading-relaxed">
                      Replaces the plain text brand title inside the header. Works best with stylized PNG typography layout graphics.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition"
                    >
                      Save Branding Image
                    </button>
                    {storeSettings.settings_store_name_image_url && (
                      <button
                        type="button"
                        onClick={() => {
                          db.saveSettings({ settings_store_name_image_url: '' });
                          triggerToast('Branding image cleared.');
                          onRefreshData();
                        }}
                        className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-full text-xs font-bold transition"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Password Admin Change */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="font-bold text-base mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-black rounded-full" />
                  Change Admin Dashboard Password
                </h3>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Current Password *</label>
                    <input
                      type="password"
                      required
                      value={passwordChange.current}
                      onChange={(e) => setPasswordChange({ ...passwordChange, current: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">New Password *</label>
                      <input
                        type="password"
                        required
                        value={passwordChange.new}
                        onChange={(e) => setPasswordChange({ ...passwordChange, new: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        value={passwordChange.confirm}
                        onChange={(e) => setPasswordChange({ ...passwordChange, confirm: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm text-gray-900"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition"
                  >
                    Change Password
                  </button>
                </form>
              </div>

              {/* Social Channels Config */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <h3 className="font-bold text-base mb-4 text-gray-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-black rounded-full" />
                  Social Networks &amp; Footer Links
                </h3>
                <form onSubmit={handleSaveSocial} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Facebook URL</label>
                      <input
                        id="social_facebook"
                        type="url"
                        defaultValue={storeSettings.social_facebook || ''}
                        placeholder="https://facebook.com/brand"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Instagram URL</label>
                      <input
                        id="social_instagram"
                        type="url"
                        defaultValue={storeSettings.social_instagram || ''}
                        placeholder="https://instagram.com/brand"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">TikTok URL</label>
                      <input
                        id="social_tiktok"
                        type="url"
                        defaultValue={storeSettings.social_tiktok || ''}
                        placeholder="https://tiktok.com/@brand"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Twitter / X URL</label>
                      <input
                        id="social_twitter"
                        type="url"
                        defaultValue={storeSettings.social_twitter || ''}
                        placeholder="https://twitter.com/brand"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">WhatsApp phone number</label>
                    <input
                      id="social_whatsapp"
                      type="tel"
                      defaultValue={storeSettings.social_whatsapp || ''}
                      placeholder="+966500000000"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm"
                    />
                    <span className="text-[10px] text-gray-400 block mt-1">
                      Enter complete country phone prefix coordinates. Used for footer triggers.
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="bg-black text-white px-5 py-2.5 rounded-full text-xs font-bold hover:opacity-90 transition w-full"
                  >
                    Save Links &amp; WhatsApp Settings
                  </button>
                </form>
              </div>

              {/* Purge / Reset Store Section */}
              <div className="bg-red-50/40 p-5 rounded-2xl border border-red-100 shadow-xs">
                <h3 className="font-bold text-base mb-2 text-red-900 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-600 rounded-full" />
                  Purge & Reset Store Content
                </h3>
                <p className="text-xs text-red-700/80 mb-4 leading-relaxed">
                  This action will instantly delete all products, banners, and reels currently in your store database to give you a clean, empty canvas. This is permanent and cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirm({ id: 'all', type: 'purge' });
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Products, Banners & Reels
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CONFIRM DELETE */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-gray-100"
            >
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                {deleteConfirm.type === 'purge' ? 'Confirm Purging Store' : 'Confirm Deletion'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {deleteConfirm.type === 'purge'
                  ? 'Are you sure you want to delete all products, banners, and reels from the database? This is permanent and cannot be undone.'
                  : `Are you sure you want to delete this ${deleteConfirm.type.replace('_', ' ')}? This action is permanent and cannot be undone.`}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm transition shadow-sm"
                >
                  {deleteConfirm.type === 'purge' ? 'Purge All' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCESS LOGIN STORE SETTINGS */}
      <AnimatePresence>
        {showSettingsLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-8 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100"
            >
              <h3 className="font-extrabold text-xl mb-2 flex items-center gap-2 text-black">
                <Lock className="w-5 h-5 text-gray-600" />
                Store Settings Login
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Enter your settings administrative keys to unlock branding, credentials, and configuration channels.
              </p>
              <form onSubmit={handleSettingsLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Settings Name</label>
                  <input
                    type="text"
                    required
                    value={settingsCreds.name}
                    onChange={(e) => setSettingsCreds({ ...settingsCreds, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm text-gray-900 bg-gray-50"
                    placeholder="Enter name"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Administrative Password</label>
                  <input
                    type="password"
                    required
                    value={settingsCreds.password}
                    onChange={(e) => setSettingsCreds({ ...settingsCreds, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-black text-sm text-gray-900 bg-gray-50"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsLogin(false);
                      setActiveTab('products');
                    }}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-black hover:opacity-90 text-white py-3 rounded-xl font-bold text-sm transition shadow-md"
                  >
                    Unlock Channels
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

// ────────────────────────────────────────────────────────
// SUB COMPONENT: PRODUCT FORM
// ────────────────────────────────────────────────────────
interface ProductFormProps {
  product: Partial<Product>;
  onCancel: () => void;
  onSave: () => void;
  categories: string[];
}

function ProductForm({ product, onCancel, onSave, categories }: ProductFormProps) {
  const isEdit = !!product.__backendId;
  const [images, setImages] = useState<string[]>(JSON.parse(product.images || '[]'));
  const [colors, setColors] = useState<string[]>(JSON.parse(product.colors || '[]'));
  const [sizes, setSizes] = useState<string[]>(JSON.parse(product.sizes || '[]'));
  const [extras, setExtras] = useState<{ name: string; price: number }[]>(JSON.parse(product.extras || '[]'));
  const [inventory, setInventory] = useState<Record<string, number>>(JSON.parse(product.inventory || '{}'));
  const [colorImageMap, setColorImageMap] = useState<Record<string, string>>(JSON.parse(product.color_image_map || '{}'));

  const [newColor, setNewColor] = useState('#000000');
  const [newSize, setNewSize] = useState('');

  // Handle addition/removal of image urls
  const handleAddImage = () => setImages([...images, '']);
  const handleUpdateImage = (i: number, val: string) => {
    const list = [...images];
    list[i] = val;
    setImages(list);
  };
  const handleRemoveImage = (i: number) => {
    setImages(images.filter((_, idx) => idx !== i));
  };

  // Variant addition
  const handleAddColor = () => {
    if (!colors.includes(newColor)) {
      setColors([...colors, newColor]);
    }
  };
  const handleRemoveColor = (col: string) => {
    setColors(colors.filter(c => c !== col));
    const nextMap = { ...colorImageMap };
    delete nextMap[col];
    setColorImageMap(nextMap);
  };

  const handleAddSize = () => {
    const clean = newSize.trim();
    if (clean && !sizes.includes(clean)) {
      setSizes([...sizes, clean]);
      setNewSize('');
    }
  };
  const handleRemoveSize = (sz: string) => {
    setSizes(sizes.filter(s => s !== sz));
  };

  // Inventory Table Value Updaters
  const handleUpdateInventory = (key: string, qty: number) => {
    setInventory({ ...inventory, [key]: Math.max(0, qty) });
  };

  // Accessory Extenders
  const handleAddExtra = () => setExtras([...extras, { name: '', price: 0 }]);
  const handleUpdateExtra = (i: number, field: 'name' | 'price', val: any) => {
    const list = [...extras];
    if (field === 'price') {
      list[i].price = parseFloat(val) || 0;
    } else {
      list[i].name = val;
    }
    setExtras(list);
  };
  const handleRemoveExtra = (i: number) => setExtras(extras.filter((_, idx) => idx !== i));

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (document.getElementById('pf_name') as HTMLInputElement).value.trim();
    const desc = (document.getElementById('pf_desc') as HTMLTextAreaElement).value.trim();
    const price = parseFloat((document.getElementById('pf_price') as HTMLInputElement).value) || 0;
    const dPrice = parseFloat((document.getElementById('pf_dprice') as HTMLInputElement).value) || 0;
    const category = (document.getElementById('pf_category') as HTMLInputElement).value.trim();

    if (!name || !price) return;

    // Build inventory representation
    let finalInventory = { ...inventory };
    if (colors.length === 0 && sizes.length === 0) {
      finalInventory = { simple: Number((document.getElementById('pf_simple_inventory') as HTMLInputElement)?.value || 0) };
    }

    const payload = {
      ...product,
      name,
      description: desc,
      price,
      discount_price: dPrice,
      category,
      images: JSON.stringify(images.filter(img => img.trim())),
      colors: JSON.stringify(colors),
      sizes: JSON.stringify(sizes),
      inventory: JSON.stringify(finalInventory),
      extras: JSON.stringify(extras.filter(ex => ex.name.trim())),
      color_image_map: JSON.stringify(colorImageMap),
      status: product.status || 'active'
    };

    db.saveProduct(payload as any);
    onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <form onSubmit={handleSaveSubmit} className="space-y-6">
        {/* Images List */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1.5">Product Images</label>
          <div className="space-y-2 mb-3">
            {images.map((img, i) => (
              <div key={i} className="flex gap-2 items-center">
                {img.trim() && (
                  <img
                    src={img}
                    alt="preview"
                    className="w-10 h-10 object-cover bg-gray-50 border border-gray-100 rounded-lg flex-shrink-0"
                  />
                )}
                <input
                  type="url"
                  required
                  placeholder="https://example.com/image.jpg"
                  value={img}
                  onChange={(e) => handleUpdateImage(i, e.target.value)}
                  className="flex-1 px-4 py-2 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="p-1 hover:text-red-500 text-gray-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddImage}
            className="text-xs font-bold text-black flex items-center gap-1 hover:opacity-75 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Image URL
          </button>
        </div>

        {/* Name and Categories */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Product Title *</label>
            <input
              id="pf_name"
              type="text"
              required
              defaultValue={product.name || ''}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Category / Collection</label>
            <input
              id="pf_category"
              type="text"
              defaultValue={product.category || ''}
              list="admin-categories"
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
              placeholder="e.g. Footwear, Watches"
            />
            <datalist id="admin-categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Detailed Description</label>
          <textarea
            id="pf_desc"
            rows={3}
            defaultValue={product.description || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Price ($) *</label>
            <input
              id="pf_price"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={product.price || ''}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Discount Price ($)</label>
            <input
              id="pf_dprice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product.discount_price || ''}
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
            />
          </div>
        </div>

        {/* Colors and linking */}
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <label className="text-xs font-bold text-gray-500 block mb-2">Available Colors</label>
          <div className="space-y-2.5 mb-4">
            {colors.map(col => (
              <div key={col} className="flex items-center gap-3 bg-white border border-gray-100 p-2.5 rounded-lg text-sm">
                <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: col }} />
                <span className="font-mono text-xs">{col}</span>

                <select
                  value={colorImageMap[col] || ''}
                  onChange={(e) => {
                    const idx = e.target.value;
                    const nextMap = { ...colorImageMap };
                    if (idx === '') delete nextMap[col];
                    else nextMap[col] = idx;
                    setColorImageMap(nextMap);
                  }}
                  className="ml-auto text-xs border border-gray-100 px-2 py-1 rounded-md bg-gray-50 text-gray-700"
                >
                  <option value="">No Image mapping</option>
                  {images.map((_, idx) => (
                    <option key={idx} value={String(idx)}>Linked to Image {idx + 1}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveColor(col)}
                  className="text-gray-400 hover:text-red-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 p-0 border border-gray-200 rounded-xl cursor-pointer bg-white"
            />
            <button
              type="button"
              onClick={handleAddColor}
              className="bg-black text-white hover:opacity-90 px-4 py-2 text-xs font-bold rounded-full transition"
            >
              Add Selected Color
            </button>
          </div>
        </div>

        {/* Sizes */}
        <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <label className="text-xs font-bold text-gray-500 block mb-2">Sizes Configuration</label>
          <div className="flex gap-2 flex-wrap mb-3">
            {sizes.map(sz => (
              <span
                key={sz}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 text-gray-800 rounded-full font-bold text-xs"
              >
                {sz}
                <button type="button" onClick={() => handleRemoveSize(sz)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-xs">
            <input
              type="text"
              placeholder="e.g. S, M, L, XL, 44, 45"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 focus:outline-none focus:border-black rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddSize}
              className="bg-black text-white px-4 py-2 text-xs font-bold rounded-lg hover:opacity-90"
            >
              Add Size
            </button>
          </div>
        </div>

        {/* Dynamic inventory calculations */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Stock Inventory Matrix</label>
          {colors.length > 0 || sizes.length > 0 ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden text-sm bg-white shadow-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 text-xs">
                    {colors.length > 0 && <th className="px-4 py-2.5 text-left">Color</th>}
                    {sizes.length > 0 && <th className="px-4 py-2.5 text-left">Size</th>}
                    <th className="px-4 py-2.5 text-left">Stock Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(colors.length > 0 ? colors : ['']).map(col =>
                    (sizes.length > 0 ? sizes : ['']).map(sz => {
                      const key = `${col}__${sz}`;
                      return (
                        <tr key={key} className="hover:bg-gray-50">
                          {colors.length > 0 && (
                            <td className="px-4 py-2.5">
                              <span className="inline-block w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: col }} />
                            </td>
                          )}
                          {sizes.length > 0 && <td className="px-4 py-2.5 font-semibold text-gray-700">{sz}</td>}
                          <td className="px-4 py-2.5">
                            <input
                              type="number"
                              min="0"
                              value={inventory[key] || 0}
                              onChange={(e) => handleUpdateInventory(key, parseInt(e.target.value) || 0)}
                              className="w-24 px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <input
                id="pf_simple_inventory"
                type="number"
                min="0"
                defaultValue={inventory.simple || 0}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
                placeholder="Stock quantity"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Single quantity stock since there are no colors/sizes specified.
              </span>
            </div>
          )}
        </div>

        {/* Optional Addons */}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1.5">Optional Accessory Addons</label>
          <div className="space-y-2 mb-3">
            {extras.map((extra, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <input
                  type="text"
                  placeholder="Addon Label (e.g. Gift wrapping)"
                  value={extra.name}
                  onChange={(e) => handleUpdateExtra(idx, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-gray-200 focus:outline-none focus:border-black rounded-lg"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={extra.price || ''}
                  onChange={(e) => handleUpdateExtra(idx, 'price', e.target.value)}
                  className="w-28 px-3 py-2 text-xs bg-white border border-gray-200 focus:outline-none focus:border-black rounded-lg"
                />
                <button type="button" onClick={() => handleRemoveExtra(idx)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddExtra}
            className="text-xs font-bold text-black flex items-center gap-1 hover:opacity-75"
          >
            <Plus className="w-3.5 h-3.5" /> Add Extra Addon
          </button>
        </div>

        {/* Submit controls */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-sm transition text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-sm transition shadow-md"
          >
            {isEdit ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// SUB COMPONENT: COUPON FORM
// ────────────────────────────────────────────────────────
interface CouponFormProps {
  coupon: Partial<Coupon>;
  onCancel: () => void;
  onSave: () => void;
}

function CouponForm({ coupon, onCancel, onSave }: CouponFormProps) {
  const isEdit = !!coupon.__backendId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = (document.getElementById('cf_code') as HTMLInputElement).value.trim().toUpperCase();
    const discount = parseFloat((document.getElementById('cf_discount') as HTMLInputElement).value) || 0;
    const limit = parseInt((document.getElementById('cf_limit') as HTMLInputElement).value) || 0;

    if (!code || !discount || !limit) return;

    db.saveCoupon({
      ...coupon,
      coupon_code: code,
      coupon_discount: discount,
      coupon_usage_limit: limit,
      coupon_usage_count: coupon.coupon_usage_count || 0
    });
    onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-md">
      <h3 className="font-bold text-lg mb-4">{isEdit ? 'Edit Coupon' : 'Create New Coupon'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Coupon Code *</label>
          <input
            id="cf_code"
            type="text"
            required
            placeholder="e.g. DISCOUNT30"
            defaultValue={coupon.coupon_code || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl uppercase font-mono tracking-wider font-semibold text-gray-950"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Discount Percentage (%) *</label>
          <input
            id="cf_discount"
            type="number"
            min="1"
            max="100"
            required
            placeholder="e.g. 20"
            defaultValue={coupon.coupon_discount || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Usage limit count *</label>
          <input
            id="cf_limit"
            type="number"
            min="1"
            required
            placeholder="e.g. 100"
            defaultValue={coupon.coupon_usage_limit || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-sm transition"
          >
            Save Coupon
          </button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// SUB COMPONENT: SHIPPING ZONE FORM
// ────────────────────────────────────────────────────────
interface ShippingZoneFormProps {
  zone: Partial<ShippingZone>;
  onCancel: () => void;
  onSave: () => void;
}

function ShippingZoneForm({ zone, onCancel, onSave }: ShippingZoneFormProps) {
  const isEdit = !!zone.__backendId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (document.getElementById('sf_name') as HTMLInputElement).value.trim();
    const price = parseFloat((document.getElementById('sf_price') as HTMLInputElement).value) || 0;

    if (!name) return;

    db.saveShippingZone({
      ...zone,
      shipping_zone_name: name,
      shipping_zone_price: price
    });
    onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-md">
      <h3 className="font-bold text-lg mb-4">{isEdit ? 'Edit Shipping Zone' : 'Create Shipping Zone'}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Zone Label *</label>
          <input
            id="sf_name"
            type="text"
            required
            placeholder="e.g. Standard Overnight, International Cargo"
            defaultValue={zone.shipping_zone_name || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Shipping Price Cost ($) *</label>
          <input
            id="sf_price"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="e.g. 5.99"
            defaultValue={zone.shipping_zone_price || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-sm transition"
          >
            Save Zone
          </button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// SUB COMPONENT: BANNER FORM
// ────────────────────────────────────────────────────────
interface BannerFormProps {
  banner: Partial<Banner>;
  onCancel: () => void;
  onSave: () => void;
}

function BannerForm({ banner, onCancel, onSave }: BannerFormProps) {
  const isEdit = !!banner.__backendId;
  const [size, setSize] = useState<'square' | 'rectangle' | 'custom'>(banner.banner_size || 'rectangle');
  const [enabled, setEnabled] = useState(banner.banner_enabled !== false);
  const [width, setWidth] = useState(banner.banner_width || 600);
  const [height, setHeight] = useState(banner.banner_height || 300);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const position = (document.getElementById('bf_position') as HTMLSelectElement).value;
    const url = (document.getElementById('bf_url') as HTMLInputElement).value.trim();

    if (!position || !url) return;

    db.saveBanner({
      ...banner,
      banner_position: position as any,
      banner_image_url: url,
      banner_enabled: enabled,
      banner_size: size,
      banner_width: size === 'custom' ? width : 0,
      banner_height: size === 'custom' ? height : 0
    });
    onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl">
      <h3 className="font-bold text-lg mb-4">{isEdit ? 'Edit Banner Configuration' : 'Create New Brand Banner'}</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Banner Placement Position *</label>
          <select
            id="bf_position"
            required
            defaultValue={banner.banner_position || ''}
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          >
            <option value="">-- Choose Segment position --</option>
            <option value="top">🔝 Top of Page Header</option>
            <option value="middle">➡️ Middle Product Feed</option>
            <option value="before_last">⬇️ Segment Before Footer</option>
            <option value="bottom">📍 Page Footer Terminal</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Banner Image URL *</label>
          <input
            id="bf_url"
            type="url"
            required
            defaultValue={banner.banner_image_url || ''}
            placeholder="https://example.com/banner.jpg"
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2.5">Banner Aspect Ratio *</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'square', label: 'Square 1:1', desc: '500×500px aspect' },
              { id: 'rectangle', label: 'Rectangle 16:9', desc: 'Widescreen landscape' },
              { id: 'custom', label: 'Custom Dimension', desc: 'Specify exact coordinates' }
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSize(item.id as any)}
                className={`p-3 border rounded-xl text-left transition-all hover:border-black ${
                  size === item.id
                    ? 'border-black bg-gray-50 shadow-xs'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <p className="text-xs font-bold text-gray-900">{item.label}</p>
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {size === 'custom' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Width (px)</label>
              <input
                type="number"
                min="100"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value) || 600)}
                className="w-full px-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Height (px)</label>
              <input
                type="number"
                min="100"
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value) || 300)}
                className="w-full px-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-black"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 bg-gray-50 p-3.5 border border-gray-100 rounded-xl">
          <input
            type="checkbox"
            id="bf_enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-black focus:ring-black border-gray-300"
          />
          <label htmlFor="bf_enabled" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
            Enable Banner immediately on the website storefront
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-sm transition shadow-md"
          >
            Save Banner
          </button>
        </div>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────
interface ReelFormProps {
  reel: Partial<Reel>;
  onCancel: () => void;
  onSave: () => void;
  lang: 'en' | 'ar';
}

function ReelForm({ reel, onCancel, onSave, lang }: ReelFormProps) {
  const isEdit = !!reel.__backendId;
  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = (document.getElementById('rf_url') as HTMLInputElement).value.trim();
    const title = (document.getElementById('rf_title') as HTMLInputElement).value.trim();
    const description = (document.getElementById('rf_desc') as HTMLTextAreaElement).value.trim();

    if (!url) return;

    db.saveReel({
      ...reel,
      reel_url: url,
      reel_title: title,
      reel_description: description
    });
    onSave();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl">
      <h3 className="font-bold text-lg mb-4">{isEdit ? t.editReel : t.addReel}</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">{t.reelUrl}</label>
          <input
            id="rf_url"
            type="url"
            required
            defaultValue={reel.reel_url || ''}
            placeholder="https://example.com/reel_video.mp4"
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">{t.reelTitle}</label>
          <input
            id="rf_title"
            type="text"
            defaultValue={reel.reel_title || ''}
            placeholder="e.g. New Summer Hoodies!"
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">{t.reelDesc}</label>
          <textarea
            id="rf_desc"
            rows={3}
            defaultValue={reel.reel_description || ''}
            placeholder="Describe your highlight..."
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:border-black rounded-xl"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold text-sm transition"
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="flex-1 bg-black text-white hover:opacity-90 py-3 rounded-xl font-bold text-sm transition shadow-md"
          >
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
