import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShoppingBag, Search, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { translations } from '../i18n';

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
          {/* Elegant Language Switcher Pill */}
          <div className="flex bg-gray-100 p-1 rounded-full text-[10px] font-extrabold border border-gray-200/50 mr-1.5 ml-1.5">
            <button
              type="button"
              onClick={() => onSetLang('en')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                lang === 'en'
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSetLang('ar')}
              className={`px-2 py-0.5 rounded-full transition-all ${
                lang === 'ar'
                  ? 'bg-white text-black shadow-xs font-black'
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              العربية
            </button>
          </div>

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
                  <span className="text-2xl font-black text-black">${Number(product.discount_price).toFixed(2)}</span>
                  <span className="text-sm text-gray-400 line-through">${Number(product.price).toFixed(2)}</span>
                </>
              ) : (
                <span className="text-2xl font-black text-gray-900">${Number(product.price).toFixed(2)}</span>
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
                      <span className="text-xs text-gray-400 font-medium ml-auto">+${ex.price.toFixed(2)}</span>
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
      </main>       {/* FULLSCREEN ZOOM LIGHTBOX MODAL */}
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
