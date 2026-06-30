import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShoppingBag, Search, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { translations, formatPrice } from '../i18n';

interface ProductPageProps {
  product: Product;
  onBackToStore: () => void;
  onAddToCart: (productId: string, color: string, size: string, extra: string, qty: number, buyNow: boolean) => void;
  onOpenCart: () => void;
  cartCount: number;
  storeSettings: StoreSettings;
  lang: 'en' | 'ar';
  onSetLang: (lang: 'en' | 'ar') => void;
}

export default function ProductPage({
  product,
  onBackToStore,
  onAddToCart,
  onOpenCart,
  cartCount,
  storeSettings,
  lang,
  onSetLang
}: ProductPageProps) {
  const images: string[] = JSON.parse(product.images || '[]');
  const colors: string[] = JSON.parse(product.colors || '[]');
  const sizes: string[] = JSON.parse(product.sizes || '[]');
  const extras: { name: string; price: number }[] = JSON.parse(product.extras || '[]');
  const inventory: Record<string, number> = JSON.parse(product.inventory || '{}');
  const colorImageMap: Record<string, string | string[]> = JSON.parse(product.color_image_map || '{}');

  const hasDiscount = product.discount_price > 0 && product.discount_price < product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.discount_price / product.price) * 100) : 0;

  const t = translations[lang];

  // Active user choices state
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState(colors[0] || '');
  const [selectedSize, setSelectedSize] = useState(sizes[0] || '');
  const [selectedExtra, setSelectedExtra] = useState('');
  const [qty, setQty] = useState(1);

  const [showLightbox, setShowLightbox] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const activeImagesList = images.length > 0 ? images : ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'];

  // Handle color change and auto image index linking
  const handleSelectColor = (col: string) => {
    setSelectedColor(col);
    const linkedIdx = colorImageMap[col];
    if (linkedIdx !== undefined && linkedIdx !== null && linkedIdx !== '') {
      const idx = parseInt(linkedIdx as string);
      if (!isNaN(idx) && idx >= 0 && idx < images.length) {
        setActiveImgIdx(idx);
      }
    }
  };

  // Build key for variant inventory lookup
  const getVariantStock = () => {
    if (colors.length > 0 || sizes.length > 0) {
      const key = `${selectedColor}__${selectedSize}`;
      return inventory[key] !== undefined ? inventory[key] : 0;
    }
    return inventory.simple || 0;
  };

  const availableStock = getVariantStock();

  // Reset PDP state if item shifts
  useEffect(() => {
    setSelectedColor(colors[0] || '');
    setSelectedSize(sizes[0] || '');
    setSelectedExtra('');
    setQty(1);

    const initialColor = colors[0];
    if (initialColor && colorImageMap[initialColor]) {
      const idx = parseInt(colorImageMap[initialColor] as string);
      if (!isNaN(idx) && idx >= 0 && idx < images.length) {
        setActiveImgIdx(idx);
        return;
      }
    }
    setActiveImgIdx(0);
  }, [product]);

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Header bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between">
        <button
          onClick={onBackToStore}
          className="flex items-center gap-2 hover:opacity-70 transition text-sm font-semibold text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t.back}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-gray-700"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenCart}
            className="relative p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-gray-700"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Expanded Quick Search inside PDP */}
      {showSearch && (
        <div className="bg-gray-50 border-b border-gray-100 px-4 md:px-8 py-4 animate-fade-in">
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-white text-gray-900 pl-11 pr-10 py-3 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-black text-center"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searchVal && (
              <button
                onClick={() => setSearchVal('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main product configuration layout */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12 flex-1 w-full">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          {/* LEFT PANEL: IMAGES VIEW & GALLERY THUMBNAILS */}
          <div className="space-y-4">
            <div
              className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100 shadow-xs cursor-zoom-in"
              onClick={() => setShowLightbox(true)}
            >
              <img
                src={activeImagesList[activeImgIdx] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600'}
                alt={product.name}
                className="w-full h-full object-cover transition-all"
              />
              {hasDiscount && (
                <span className="absolute top-4 left-4 bg-red-500 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-full tracking-wider shadow-sm uppercase">
                  -{discountPct}% Save
                </span>
              )}
            </div>

            {/* Thumbnail Carousel strip */}
            {activeImagesList.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 select-none">
                {activeImagesList.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImgIdx(i)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border-2 transition ${
                      i === activeImgIdx ? 'border-black opacity-100 shadow-xs' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: METADATA DETAILS & CHOICES */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            <div>
              {product.category && (
                <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-1">
                  {product.category}
                </span>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {product.name}
              </h2>
            </div>

            {/* Pricing Section */}
            <div className="flex items-baseline gap-3">
              {hasDiscount ? (
                <>
                  <span className="text-2xl font-black text-black">{formatPrice(product.discount_price, lang)}</span>
                  <span className="text-sm text-gray-400 line-through">{formatPrice(product.price, lang)}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-gray-900">{formatPrice(product.price, lang)}</span>
              )}
            </div>

            {/* Paragraph Bio */}
            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed font-normal">
                {product.description}
              </p>
            )}

            {/* Colors Variant Configurator */}
            {colors.length > 0 && (
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wide">
                  {t.colorVariant}:{' '}
                  <span className="font-extrabold text-black font-mono lowercase text-xs bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{selectedColor}</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(col => (
                    <button
                      key={col}
                      onClick={() => handleSelectColor(col)}
                      className={`w-9 h-9 rounded-full border-2 transition hover:scale-105 ${
                        selectedColor === col ? 'border-black shadow-md' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: col }}
                      title={col}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sizes Variant Configurator */}
            {sizes.length > 0 && (
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wide">
                  {t.selectSize}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map(sz => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`px-4 py-2 text-xs font-extrabold rounded-xl transition ${
                        selectedSize === sz
                          ? 'bg-black text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Accessory Extras list */}
            {extras.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 block mb-1 uppercase tracking-wide">
                  {t.optionalAddons}
                </label>
                <div className="space-y-1.5">
                  {extras.map(ex => (
                    <label
                      key={ex.name}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none border transition ${
                        selectedExtra === ex.name
                          ? 'bg-gray-50 border-black'
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExtra === ex.name}
                        onChange={(e) => setSelectedExtra(e.target.checked ? ex.name : '')}
                        className="w-4 h-4 rounded text-black focus:ring-black border-gray-300"
                      />
                      <span className="text-xs font-bold text-gray-900">{ex.name}</span>
                      <span className="text-xs text-gray-400 font-medium ml-auto">+{formatPrice(ex.price, lang)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity select counter & stock status display */}
            <div className="flex items-center gap-6">
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wide">
                  {t.quantity}
                </label>
                <div className="inline-flex items-center bg-gray-100 rounded-xl overflow-hidden border border-gray-200 select-none">
                  <button
                    onClick={() => setQty(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 font-black text-sm hover:bg-gray-200 text-gray-600 transition"
                  >
                    −
                  </button>
                  <span className="px-4 py-1.5 text-xs font-black text-center min-w-10 text-gray-900">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(prev => Math.min(availableStock, prev + 1))}
                    className="px-3 py-1.5 font-black text-sm hover:bg-gray-200 text-gray-600 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-xs">
                <p className="font-bold text-gray-400 mb-1 uppercase tracking-wide">{t.stockAvailability}</p>
                {availableStock > 0 ? (
                  <span className="text-emerald-600 font-extrabold text-xs">
                    {availableStock} {t.unitsRemaining}
                  </span>
                ) : (
                  <span className="text-red-600 font-extrabold text-xs">
                    {t.outOfStockVariant}
                  </span>
                )}
              </div>
            </div>

            {/* CTA action triggers */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 flex-col sm:flex-row">
              <button
                disabled={availableStock === 0}
                onClick={() => onAddToCart(product.__backendId, selectedColor, selectedSize, selectedExtra, qty, false)}
                className={`flex-1 py-4 px-6 rounded-full font-bold text-sm transition shadow-xs flex items-center justify-center gap-2 ${
                  availableStock === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-black text-white hover:opacity-90'
                }`}
              >
                <ShoppingBag className="w-4 h-4" /> {t.addToCart}
              </button>
              <button
                disabled={availableStock === 0}
                onClick={() => onAddToCart(product.__backendId, selectedColor, selectedSize, selectedExtra, qty, true)}
                className={`flex-1 py-4 px-6 rounded-full font-bold text-sm transition border-2 ${
                  availableStock === 0
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-black text-black hover:bg-gray-50'
                }`}
              >
                {t.buyNow}
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Main Brand Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 px-6 py-12 text-center mt-auto flex-shrink-0 relative">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Social icons links list */}
          <div className="flex items-center justify-center gap-3">
            {[
              { id: 'social_facebook', icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ), url: storeSettings.social_facebook },
              { id: 'social_instagram', icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              ), url: storeSettings.social_instagram },
              { id: 'social_tiktok', icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.68v12.7a2.85 2.85 0 11-5.66-2.06 2.89 2.89 0 011.08.36V9.4a6.53 6.53 0 00-1.08-.1 6.81 6.81 0 106.18 6.69v-3.19a8.5 8.5 0 005.54-2.25v-3.26s-1.88.09-3.63-.87z"/>
                </svg>
              ), url: storeSettings.social_tiktok },
              { id: 'social_twitter', icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              ), url: storeSettings.social_twitter },
              { id: 'social_whatsapp', icon: (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
              ), url: storeSettings.social_whatsapp }
            ]
              .filter(s => s.url && s.url.trim())
              .map(social => {
                let finalUrl = social.url;
                if (social.id === 'social_whatsapp') {
                  const cleaned = social.url.replace(/[^0-9]/g, '');
                  finalUrl = `https://wa.me/${cleaned}`;
                }

                return (
                  <a
                    key={social.id}
                    href={finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-black hover:scale-110 transition text-white rounded-full flex items-center justify-center shadow-xs"
                  >
                    {social.icon}
                  </a>
                );
              })}
          </div>

          <div className="w-10 h-0.5 bg-black rounded-full mx-auto" />

          {/* Footer Language Switcher */}
          <div className="flex justify-center py-2">
            <div className="inline-flex bg-white p-1 rounded-full text-xs font-extrabold border border-gray-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => onSetLang('en')}
                className={`px-4 py-2 rounded-full transition-all duration-200 font-bold cursor-pointer ${
                  lang === 'en'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                EN (English)
              </button>
              <button
                type="button"
                onClick={() => onSetLang('ar')}
                className={`px-4 py-2 rounded-full transition-all duration-200 font-bold cursor-pointer ${
                  lang === 'ar'
                    ? 'bg-black text-white shadow-md'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                العربية (Arabic)
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-extrabold text-sm text-gray-900">
              {storeSettings.settings_store_name || 'Pro Shop'}
            </p>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
              {lang === 'ar' ? 'حلول تسوق فاخرة وبسيطة' : 'Premium Minimalist Retail Solutions'}
            </p>
          </div>

          <p className="text-[10px] text-gray-400">
            &copy; 2026 {storeSettings.settings_store_name || 'Pro Shop'}. {t.rightsReserved}
          </p>
        </div>
      </footer>

      {/* FULLSCREEN ZOOM LIGHTBOX MODAL */}
      <AnimatePresence>
        {showLightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-6 right-6 text-white hover:opacity-75 transition"
            >
              <X className="w-8 h-8" />
            </button>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={activeImagesList[activeImgIdx] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1000'}
                alt="Fullscreen Preview"
                className="w-full h-auto rounded-xl max-h-[80vh] object-contain mx-auto"
              />

              {activeImagesList.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImgIdx(prev => (prev - 1 + activeImagesList.length) % activeImagesList.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setActiveImgIdx(prev => (prev + 1) % activeImagesList.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
