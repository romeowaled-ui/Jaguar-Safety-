import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, X, Package, Settings, Globe } from 'lucide-react';
import { Product, Banner, StoreSettings } from '../types';
import { translations } from '../i18n';
import { db } from '../db';

interface StorefrontProps {
  products: Product[];
  banners: Banner[];
  storeSettings: StoreSettings;
  onSelectProduct: (p: Product) => void;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  cartCount: number;
  lang: 'en' | 'ar';
  onSetLang: (lang: 'en' | 'ar') => void;
}

export default function Storefront({
  products,
  banners,
  storeSettings,
  onSelectProduct,
  onOpenCart,
  onOpenAdmin,
  cartCount,
  lang,
  onSetLang
}: StorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const t = translations[lang];
  const reels = db.getReels();

  // Extract unique active categories
  const getCategoriesList = () => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.status === 'active') cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  };

  const categories = getCategoriesList();

  // Helper to determine product stock status
  const isProductInStock = (p: Product) => {
    const inventory = JSON.parse(p.inventory || '{}');
    const colors = JSON.parse(p.colors || '[]');
    const sizes = JSON.parse(p.sizes || '[]');

    if (colors.length > 0 || sizes.length > 0) {
      for (const key in inventory) {
        if (inventory[key] > 0) return true;
      }
      return false;
    } else {
      return (inventory.simple || 0) > 0;
    }
  };

  // Helper to get image arrays safely
  const getProductImages = (p: Product) => {
    const imgs = JSON.parse(p.images || '[]');
    if (imgs.length > 0) return imgs;
    // Fallback vector canvas
    return [`data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='%23f1f5f9'/><text x='200' y='210' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8'>${encodeURIComponent(p.name[0])}</text></svg>`];
  };

  // Filters logic
  let filteredProducts = products.filter(p => p.status === 'active');

  // Search filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (selectedCategory !== 'All') {
    filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
  }

  // Banners layout positioning filter
  const getBannerByPosition = (pos: Banner['banner_position']) => {
    return banners.find(b => b.banner_position === pos && b.banner_enabled);
  };

  const topBanner = getBannerByPosition('top');
  const middleBanner = getBannerByPosition('middle');
  const beforeLastBanner = getBannerByPosition('before_last');
  const bottomBanner = getBannerByPosition('bottom');

  const getBannerStyle = (b: Banner) => {
    if (b.banner_size === 'square') return 'aspect-square max-w-lg mx-auto';
    if (b.banner_size === 'rectangle') return 'aspect-video w-full';
    return 'w-full'; // Custom sizing is constrained inside the frame
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
      {/* Navigation Header bar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between">
        {/* Brand logo or label */}
        <div
          onClick={() => {
            setSelectedCategory('All');
            setSearchQuery('');
            setShowMobileNav(false);
          }}
          className="flex items-center gap-3 cursor-pointer"
        >
          {storeSettings.settings_admin_logo_url && (
            <img
              src={storeSettings.settings_admin_logo_url}
              alt="Brand Logo"
              className="h-9 object-contain"
            />
          )}

          {storeSettings.settings_store_name_image_url ? (
            <img
              src={storeSettings.settings_store_name_image_url}
              alt="Brand Logo Graphics"
              className="h-10 object-contain"
            />
          ) : (
            <h1 className="text-xl font-black tracking-tight uppercase font-display">
              {storeSettings.settings_store_name || 'Pro Shop'}
            </h1>
          )}
        </div>

        {/* Category desktop strip */}
        {categories.length > 1 && (
          <div className="hidden md:flex items-center gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition ${
                  selectedCategory === cat
                    ? 'bg-black text-white'
                    : 'text-gray-500 hover:text-black hover:bg-gray-50'
                }`}
              >
                {cat === 'All' ? t.allCategories : cat}
              </button>
            ))}
          </div>
        )}

        {/* Quick controls widgets */}
        <div className="flex items-center gap-1.5">
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
            onClick={() => setShowSearchInput(!showSearchInput)}
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
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Expanded Quick Search Container */}
      {showSearchInput && (
        <div className="bg-gray-50 border-b border-gray-100 px-4 md:px-8 py-4 animate-fade-in flex-shrink-0">
          <div className="max-w-md mx-auto relative">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-gray-900 pl-11 pr-10 py-3 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-black text-center"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expanded Mobile Overlay Menu */}
      {showMobileNav && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs z-30" onClick={() => setShowMobileNav(false)} />
          <div className="absolute right-4 top-20 bg-white border border-gray-100 w-56 rounded-2xl shadow-xl z-40 p-3 animate-fade-in">
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setShowMobileNav(false);
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-900"
              >
                Storefront
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowMobileNav(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 rounded-xl text-xs font-medium ${
                    selectedCategory === cat ? 'text-black font-bold' : 'text-gray-500'
                  }`}
                >
                  {cat === 'All' ? t.allCategories : cat}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Top advertising Banner placement */}
      {topBanner && (
        <div className="px-4 md:px-8 py-4">
          <div className={`rounded-2xl overflow-hidden border border-gray-50 shadow-xs ${getBannerStyle(topBanner)}`}>
            <img
              src={topBanner.banner_image_url}
              alt="Promo Widescreen"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Store Products Feed */}
      <section className="px-4 md:px-8 py-8 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 max-w-md mx-auto">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {t.noProducts}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Middle advertising banner integration */}
            {middleBanner && (
              <div className="rounded-2xl overflow-hidden border border-gray-50 shadow-xs">
                <div className={getBannerStyle(middleBanner)}>
                  <img
                    src={middleBanner.banner_image_url}
                    alt="Product Collection Promo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Products grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
              {filteredProducts.map(p => {
                const imgs = getProductImages(p);
                const price = Number(p.price);
                const dPrice = Number(p.discount_price);
                const hasDiscount = dPrice > 0 && dPrice < price;
                const inStock = isProductInStock(p);

                return (
                  <div
                    key={p.__backendId}
                    onClick={() => inStock && onSelectProduct(p)}
                    className={`group cursor-pointer flex flex-col ${!inStock ? 'cursor-not-allowed' : ''}`}
                  >
                    {/* Image wrap */}
                    <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100">
                      <img
                        src={imgs[0]}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {!inStock && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="bg-red-500 text-white font-black text-[10px] md:text-xs uppercase px-4 py-2 rounded-full tracking-wider shadow-md">
                            {t.outOfStock}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Metadata details */}
                    <div className={`mt-3 flex-1 flex flex-col justify-between ${!inStock ? 'opacity-65' : ''}`}>
                      <div>
                        {p.category && (
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-1">
                            {p.category}
                          </span>
                        )}
                        <h3 className="font-bold text-sm text-gray-900 group-hover:text-black line-clamp-2 leading-tight">
                          {p.name}
                        </h3>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-extrabold text-black">${dPrice.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 line-through">${price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">${price.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Before Last promo banner placement */}
            {beforeLastBanner && (
              <div className="rounded-2xl overflow-hidden border border-gray-50 shadow-xs pt-4">
                <div className={getBannerStyle(beforeLastBanner)}>
                  <img
                    src={beforeLastBanner.banner_image_url}
                    alt="Footer Lead Promo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modern Horizontal Scrollable Reels Section */}
      {reels.length > 0 && (
        <section className="px-4 md:px-8 py-10 border-t border-gray-100 bg-gray-50/40">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-1">
              <div>
                <h2 className="text-lg font-black tracking-tight uppercase font-display flex items-center gap-2 text-gray-950">
                  <span className="w-1.5 h-5 bg-black rounded-full inline-block" />
                  {t.reelsSectionTitle}
                </h2>
                <p className="text-xs text-gray-400 font-medium mt-1">
                  {t.reelsSectionSub}
                </p>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-200">
              {reels.map((reel) => (
                <div
                  key={reel.__backendId}
                  className="w-64 aspect-[9/16] bg-black rounded-3xl overflow-hidden relative shadow-md flex-shrink-0 snap-start group border border-gray-100"
                >
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
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 text-white pointer-events-none">
                      {reel.reel_title && (
                        <h4 className="font-bold text-xs truncate">{reel.reel_title}</h4>
                      )}
                      {reel.reel_description && (
                        <p className="text-[10px] text-gray-300 line-clamp-2 mt-1 leading-normal">
                          {reel.reel_description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Terminal Footer placement banner */}
      {bottomBanner && (
        <div className="px-4 md:px-8 py-4">
          <div className={`rounded-2xl overflow-hidden border border-gray-50 shadow-xs ${getBannerStyle(bottomBanner)}`}>
            <img
              src={bottomBanner.banner_image_url}
              alt="Bottom Footer Banner"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

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

        {/* Quick Admin access hook */}
        <button
          onClick={onOpenAdmin}
          className="absolute bottom-4 right-4 text-gray-300 hover:text-black hover:bg-gray-100 p-2.5 rounded-full transition"
          title="Open Admin Panel Workspace"
        >
          <Settings className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
