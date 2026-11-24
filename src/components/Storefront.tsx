"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { seedProducts } from "@/lib/catalog";
import { CATEGORIES, type Product, type Category, type SaleBanner, type Reel } from "@/lib/types";
import { seedReels } from "@/lib/reels";

const HERO_IMAGE = "https://lh3.googleusercontent.com/aida-public/AB6AXuAAoKy5HKKWaLl-UZGXQTYW0ehcxmkKA1eeLZ9KusE5T8MEq_FWkfO5zdfd_Og75P_A7dKcbAIm9M-zvBAJsPh2PvzsOSCMmQ95ZYgaYXXTG5DUnbDwdCPOYLa9ztU9x_jgGtFPBImpYy7iybnvmizqLeJMk9qHyBSQyUJG3mXz-NwGIpGNQdpLdx6XhSutFQjNWzim1VdQkBq-lI4tzwoa9_CwRhIYjoPGwFgGQ64";
const categoryEmoji: Record<string, string> = {
  Sundaes: "🍨",
  "Brownies & Snownies": "🍫",
  "Cakes & Cupcakes": "🎂",
  "Exclusive Deals": "🎁",
};
const price = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;
const reelEmbedUrl = (url: string) => {
  const parsed = new URL(url);
  const [, type, shortcode] = parsed.pathname.match(/^\/(reel|p)\/([\w-]+)/) ?? [];
  return type && shortcode ? `https://www.instagram.com/${type}/${shortcode}/embed` : url;
};

function useReveal() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal-up,.reveal-fade,.stagger-child").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    const revealSelector = ".reveal-up,.reveal-fade,.stagger-child";
    const observe = (element: Element, index: number) => {
      if (observed.has(element)) return;
      observed.add(element);
      (element as HTMLElement).style.transitionDelay = `${Math.min(index % 5 * 70, 350)}ms`;
      observer.observe(element);
    };
    const attach = (root: ParentNode) => {
      if (root instanceof Element && root.matches(revealSelector)) observe(root, 0);
      root.querySelectorAll(revealSelector).forEach(observe);
    };
    attach(document);
    const mutations = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) attach(node);
    })));
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, []);
}

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>(() => seedProducts.map((item, index) => ({ ...item, id: `seed-${index}` })));
  const [categories, setCategories] = useState<Category[]>([...CATEGORIES]);
  const [banners, setBanners] = useState<SaleBanner[]>([]);
  const [reels, setReels] = useState<Reel[]>(() => seedReels.map((reel, index) => ({ ...reel, id: `seed-reel-${index}` })));
  const [bannerIndex, setBannerIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<Category>("Sundaes");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartProduct, setCartProduct] = useState<Product | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedFlavor, setSelectedFlavor] = useState("");
  const [city, setCity] = useState("Faisalabad");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [catalogError, setCatalogError] = useState("");
  useReveal();

  useEffect(() => {
    let active = true;
    fetch("/api/products", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json() as { error?: string };
          throw new Error(result.error || "Unable to load the live menu.");
        }
        return await response.json() as Product[];
      })
      .then((result) => {
        if (active) { setProducts(result); setCatalogError(""); }
      })
      .catch((reason: unknown) => {
        if (active) setCatalogError(reason instanceof Error ? reason.message : "Unable to load the live menu.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/reels", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load Instagram Reels.");
        return await response.json() as Reel[];
      })
      .then((result) => { if (active) setReels(result); })
      .catch((reason: unknown) => { if (active) console.error(reason instanceof Error ? reason.message : "Unable to load Instagram Reels."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((index) => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/banners", { cache: "no-store" }),
    ]).then(async ([categoryResponse, bannerResponse]) => {
      if (!categoryResponse.ok || !bannerResponse.ok) throw new Error("Unable to load current categories and offers.");
      const [categoryData, bannerData] = await Promise.all([
        categoryResponse.json() as Promise<Array<{ name: string }>>,
        bannerResponse.json() as Promise<SaleBanner[]>,
      ]);
      if (active) {
        setCategories(categoryData.map((entry) => entry.name));
        setBanners(bannerData.filter((entry) => entry.is_active === true && entry.title.trim().length > 0));
      }
    }).catch((reason: unknown) => {
      if (active) console.error(reason instanceof Error ? reason.message : "Unable to load current offers.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedProduct || activeReel ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedProduct, activeReel]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setSelectedProduct(null); setActiveReel(null); setMobileMenu(false); }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const visibleProducts = useMemo(() => products.filter((item) => item.category === activeCategory), [products, activeCategory]);

  const chooseCategory = (category: Category) => {
    setActiveCategory(category);
    setMobileMenu(false);
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };
  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    setCartProduct(product);
    setQuantity(1);
    setCartCount(1);
    setSelectedFlavor(product.flavors?.[0] ?? "");
  };
  const orderText = selectedProduct
    ? `Hi Huddle Bakery! I would like to order:\n- Item: ${selectedProduct.name}${selectedFlavor ? ` (${selectedFlavor})` : ""}\n- Quantity: ${quantity}\n- Total: ${price(selectedProduct.price * quantity)}\n- Delivery Destination: ${city}`
    : "Hello Huddle Bakery! I would like to place an order.";
  const orderLink = `https://wa.me/923417251879?text=${encodeURIComponent(orderText)}`;

  return (
    <div className="min-h-screen bg-cream text-espresso antialiased selection:bg-caramel selection:text-white">
      <header className="sticky top-0 z-40 bg-espresso text-white shadow-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a className="group flex items-center gap-3" href="#hero">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-caramel/70 bg-espressoDark font-serif text-lg font-bold text-caramel shadow-inner transition-transform group-hover:scale-105">H</span>
            <span><span className="block font-serif text-lg font-bold uppercase leading-none tracking-widest sm:text-xl">HUDDLE BAKERY</span><span className="mt-1 block text-[9px] font-medium uppercase tracking-[.25em] text-caramel">Bakes • Sweets • Love</span></span>
          </a>
          <nav className="hidden items-center space-x-5 text-[10px] font-medium uppercase tracking-wider text-neutral-200 xl:flex">
            <a className="hover:text-caramel" href="#hero">Home</a>
            {categories.map((category) => <button className="hover:text-caramel" key={category} onClick={() => chooseCategory(category)}>{category}</button>)}
            <a className="hover:text-caramel" href="#reels">Reels</a><a className="hover:text-caramel" href="#reviews">Reviews</a><a className="hover:text-caramel" href="#footer">Contact</a><a className="text-[9px] text-caramel/80 hover:text-caramel" href="/admin">Staff Login</a>
          </nav>
          <div className="flex items-center gap-3">
            <button aria-label="View order box" title="View Cart / Drawer" onClick={() => { const item = cartProduct ?? products[0]; if (item) openProduct(item); }} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-caramel/40 bg-espressoDark text-caramel hover:bg-caramel hover:text-espresso">
              <i className="fa-solid fa-cart-shopping text-sm" /><span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-espresso bg-caramel text-[10px] font-bold text-espresso">{cartCount}</span>
            </button>
            <a className="whatsapp-pulse inline-flex items-center gap-1.5 rounded-full bg-caramel px-4 py-2 font-serif text-xs font-semibold uppercase tracking-wider text-espresso shadow-sm hover:-translate-y-0.5 hover:bg-caramelDark sm:px-5" href={orderLink} target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp text-sm" /><span>Order Now</span></a>
            <button aria-label="Toggle navigation" aria-expanded={mobileMenu} className="p-2 text-neutral-200 hover:text-white xl:hidden" onClick={() => setMobileMenu(!mobileMenu)}><i className={`fa-solid ${mobileMenu ? "fa-xmark" : "fa-bars"} text-xl`} /></button>
          </div>
        </div>
        {mobileMenu && <nav className="space-y-2 border-t border-white/10 bg-espressoDark px-5 py-4 text-sm text-neutral-200 xl:hidden">
          <a className="block py-1 hover:text-caramel" href="#hero" onClick={() => setMobileMenu(false)}>Home</a>
          {categories.map((category) => <button key={category} className="block py-1 hover:text-caramel" onClick={() => chooseCategory(category)}>{category}</button>)}
          <a className="block py-1 hover:text-caramel" href="#reels" onClick={() => setMobileMenu(false)}>Reels</a>
          <a className="block py-1 hover:text-caramel" href="#reviews" onClick={() => setMobileMenu(false)}>Reviews</a>
          <a className="block py-1 text-caramel" href="/admin">Staff Login</a>
        </nav>}
      </header>

      {banners.length > 0 && <section aria-label="Special offers" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="relative max-h-[220px] min-h-[140px] overflow-hidden rounded-2xl border border-[#C89D54]/40 bg-gradient-to-r from-[#361312] via-[#290c0b] to-[#3d1715] text-[#F7EFE3] shadow-md sm:min-h-[175px]">
          {banners[bannerIndex] && <div key={banners[bannerIndex].id} className={`banner-fade relative ${banners[bannerIndex].image_url ? "grid grid-cols-1 items-center md:grid-cols-12" : "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"}`}>
            <div className={banners[bannerIndex].image_url ? "relative z-10 p-4 pr-[36%] sm:p-6 sm:pr-[36%] md:col-span-7 md:pr-6" : "min-w-0"}>
              <div className="space-y-2">
                {banners[bannerIndex].badge && <span className="inline-flex rounded-full bg-[#C89D54] px-3 py-1 text-[9px] font-bold uppercase tracking-[.16em] text-[#361312]">{banners[bannerIndex].badge}</span>}
                <h2 className="line-clamp-2 font-editorial text-base font-bold leading-tight text-[#F7EFE3] sm:text-xl">{banners[bannerIndex].title}</h2>
                {banners[bannerIndex].description && <p className="line-clamp-2 max-w-2xl text-[11px] leading-relaxed text-[#F7EFE3]/80 sm:text-sm">{banners[bannerIndex].description}</p>}
                {banners[bannerIndex].cta_text && banners[bannerIndex].cta_link && <a href={banners[bannerIndex].cta_link} target={banners[bannerIndex].cta_link.startsWith("http") ? "_blank" : undefined} rel={banners[bannerIndex].cta_link.startsWith("http") ? "noopener noreferrer" : undefined} className="inline-flex rounded-full bg-[#C89D54] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#361312] shadow-sm hover:bg-[#E8D4B0] sm:mt-1 sm:px-5 sm:py-2.5 sm:text-xs">{banners[bannerIndex].cta_text}</a>}
              </div>
            </div>
            {banners[bannerIndex].image_url && <div className="absolute inset-y-0 right-0 w-[34%] md:relative md:col-span-5 md:h-[185px] md:w-full">
              <Image src={banners[bannerIndex].image_url} alt="" fill unoptimized sizes="(max-width: 768px) 35vw, 500px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#290c0b]/40 via-transparent to-transparent" />
            </div>}
          </div>}
          {banners.length > 1 && <>
            <button type="button" aria-label="Previous promotion" onClick={() => setBannerIndex((index) => (index - 1 + banners.length) % banners.length)} className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#361312]/75 text-white shadow hover:bg-[#361312] sm:left-3 sm:h-9 sm:w-9"><i className="fa-solid fa-chevron-left text-[10px] sm:text-xs" /></button>
            <button type="button" aria-label="Next promotion" onClick={() => setBannerIndex((index) => (index + 1) % banners.length)} className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#361312]/75 text-white shadow hover:bg-[#361312] sm:right-3 sm:h-9 sm:w-9"><i className="fa-solid fa-chevron-right text-[10px] sm:text-xs" /></button>
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-3">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`Show promotion ${index + 1}`} aria-pressed={bannerIndex === index} onClick={() => setBannerIndex(index)} className={`h-1.5 rounded-full transition-all ${bannerIndex === index ? "w-5 bg-[#C89D54]" : "w-1.5 bg-white/60"}`} />)}</div>
          </>}
        </div>
      </section>}

      <main>
        <section id="hero" data-purpose="hero-banner" className="relative isolate flex min-h-[82vh] w-full items-center overflow-hidden bg-cream lg:min-h-[88vh]">
          <Image alt="" aria-hidden="true" priority unoptimized fill sizes="100vw" className="object-cover object-center" src={HERO_IMAGE} />
          <div className="hero-copy-scrim absolute inset-0" />
          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-3xl space-y-6 text-center lg:text-left">
              <div className="hero-entrance inline-flex items-center gap-2 rounded-full border border-borderWarm bg-sandCard/90 px-3 py-1 text-xs font-semibold tracking-wider text-espresso shadow-sm" style={{ animationDelay: "80ms" }}><span className="h-1.5 w-1.5 rounded-full bg-caramel" />Handcrafted Luxury Confections</div>
              <h1 className="hero-entrance font-editorial text-4xl font-bold leading-[1.12] tracking-tight text-espresso sm:text-5xl lg:text-7xl" style={{ animationDelay: "180ms" }}>Baked Fresh.<br /><span className="font-normal italic text-caramelDark">Shared Together.</span></h1>
              <p className="hero-entrance mx-auto max-w-xl text-base font-light leading-relaxed text-espresso/85 sm:text-lg lg:mx-0" style={{ animationDelay: "280ms" }}>Our Signature Handcrafted Treats — Crafted daily with premium ingredients, delivered across Punjab.</p>
              <div className="hero-entrance flex flex-wrap items-center justify-center gap-4 pt-2 lg:justify-start" style={{ animationDelay: "380ms" }}><a className="rounded-full bg-espresso px-7 py-3 text-xs font-semibold uppercase tracking-widest text-white shadow-md hover:-translate-y-0.5 hover:bg-espressoDark" href="#menu">Shop Collection</a><button className="rounded-full border border-espresso/40 bg-cream/50 px-7 py-3 text-xs font-semibold uppercase tracking-widest text-espresso hover:bg-sandCard" onClick={() => chooseCategory("Exclusive Deals")}>Explore Deals</button></div>
              <div className="hero-entrance flex flex-wrap justify-center gap-2 border-t border-espresso/10 pt-6 text-xs font-medium text-espresso lg:justify-start" style={{ animationDelay: "480ms" }}><span className="rounded-full border border-borderWarm bg-sandCard/90 px-3 py-1.5">✨ 100% Fresh Daily</span><span className="rounded-full border border-borderWarm bg-sandCard/90 px-3 py-1.5">📍 Faisalabad, Multan &amp; Kot Addu</span><span className="rounded-full border border-borderWarm bg-sandCard/90 px-3 py-1.5">🍫 Pure Belgian Cocoa</span></div>
              <div className="float-slow mx-auto inline-flex items-center gap-3 rounded-xl border border-white/10 bg-espresso/90 px-4 py-2.5 text-white shadow-lg backdrop-blur lg:mx-0"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-caramel text-sm font-bold text-espresso">★</span><span><span className="block text-xs font-semibold leading-tight">Master Confectioners</span><span className="text-[10px] tracking-wide text-caramel">Faisalabad • Multan • Kot Addu</span></span></div>
            </div>
          </div>
        </section>

        <section id="menu" data-purpose="product-menu" className="border-b border-borderWarm bg-creamLight py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="reveal-up mx-auto mb-10 max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Artisanal Selection</span><h2 className="mt-1 font-editorial text-3xl font-bold text-espresso sm:text-4xl">Our Signature Menu &amp; Deals</h2><p className="reveal-fade mt-2 text-sm font-light text-espresso/70">Freshly layered confections, baked daily and packaged in luxury boxes.</p></div>
            <div className="mb-8 flex items-center justify-center gap-2 overflow-x-auto pb-4 sm:gap-4">
              {categories.map((category) => <button key={category} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all sm:px-6 ${activeCategory === category ? "border-espresso bg-espresso text-white shadow-sm" : "border-borderWarm bg-sandCard text-espresso hover:bg-sandHover"}`}>{categoryEmoji[category] || "🍰"} {category}</button>)}
            </div>
            {catalogError && <p role="status" className="mb-4 rounded-xl border border-caramel/40 bg-caramel/10 px-4 py-3 text-center text-xs text-espresso">Showing the starter menu because the live catalog is unavailable: {catalogError}</p>}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {visibleProducts.length ? visibleProducts.map((item) => <article key={item.id} className="stagger-child polished-card group flex flex-col justify-between rounded-xl border border-borderWarm bg-sandCard p-2.5 sm:p-3">
                <div><Link href={item.id.startsWith("seed-") ? "#menu" : `/product/${item.id}`} onClick={(event) => { if (item.id.startsWith("seed-")) { event.preventDefault(); openProduct(item); } }} className="relative mb-2 block aspect-[4/3] overflow-hidden rounded-lg bg-espresso/5"><span className="absolute left-1.5 top-1.5 z-10 max-w-[85%] truncate rounded bg-espresso px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-caramel">{item.badge || "HUDDLE SPECIAL"}</span><Image alt={item.name} unoptimized fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" src={item.image_url} /></Link>
                  <Link href={item.id.startsWith("seed-") ? "#menu" : `/product/${item.id}`} onClick={(event) => { if (item.id.startsWith("seed-")) { event.preventDefault(); openProduct(item); } }} className="line-clamp-1 font-editorial text-sm font-bold text-espresso hover:text-caramelDark sm:text-base">{item.name}</Link>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5"><p className="text-xs font-bold text-espresso sm:text-sm">{price(item.price)}</p>{item.regular_price && <del className="text-[10px] text-espresso/50">Rs {item.regular_price}</del>}</div>
                  <p className="mt-1 text-[10px] text-caramelDark">★ {(item.average_rating ?? 0).toFixed(1)} <span className="text-espresso/50">({item.review_count ?? 0})</span></p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-espresso/10 pt-2"><Link href={item.id.startsWith("seed-") ? "#menu" : `/product/${item.id}`} onClick={(event) => { if (item.id.startsWith("seed-")) { event.preventDefault(); openProduct(item); } }} className="rounded-md border border-espresso/25 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide hover:bg-white/60">View</Link><a className="rounded-md bg-caramel py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-espresso hover:bg-caramelDark" href={`https://wa.me/923417251879?text=${encodeURIComponent(`Hello Huddle Bakery! I want to instantly order: ${item.name} (${price(item.price)})`)}`} target="_blank" rel="noopener noreferrer">Buy Now</a></div>
              </article>) : <div className="col-span-full rounded-2xl border border-borderWarm bg-sandCard p-10 text-center text-sm text-espresso/70">No items in this category yet.</div>}
            </div>
          </div>
        </section>

        <section id="reels" data-purpose="reels-showcase" className="border-b border-borderWarm bg-cream py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col justify-between md:flex-row md:items-end"><div><span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-caramelDark"><i className="fa-brands fa-instagram text-base" />From Our Kitchen</span><h2 className="reveal-up mt-1 font-editorial text-3xl font-bold text-espresso sm:text-4xl">Watch Our Viral Reels</h2><p className="reveal-fade mt-1 text-sm font-light text-espresso/70">Behind the scenes: chocolate drizzling, velvety textures, and daily box packing.</p></div><a className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-caramelDark hover:text-espresso md:mt-0" href="https://www.instagram.com/___huddle_?knvt=ZjZxdGNjNGF5aTU=" target="_blank" rel="noopener noreferrer">Follow @___huddle_ <i className="fa-solid fa-arrow-up-right-from-square" /></a></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-5">
              {reels.map((reel) => <article key={reel.id} className="stagger-child group flex flex-col rounded-xl border border-borderWarm bg-sandCard p-2.5 shadow-warm-soft hover:shadow-md sm:p-3"><button onClick={() => setActiveReel(reel)} aria-label={`Play ${reel.title}`} className="relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-espressoDark text-left"><Image alt={`${reel.title} thumbnail`} unoptimized fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" src={reel.thumbnail_url} /><span className="absolute inset-0 flex items-center justify-center bg-espresso/30 transition-all group-hover:bg-espresso/15"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-caramel/90 text-espresso shadow-lg transition-transform group-hover:scale-110"><i className="fa-solid fa-play ml-1" /></span></span><span className="absolute right-2 top-2 rounded-full bg-espresso/80 px-2 py-1 text-[9px] text-white"><i className="fa-brands fa-instagram mr-1 text-caramel" />Reel</span></button><div className="mt-2 flex min-h-12 items-center justify-between gap-2"><p className="line-clamp-2 font-editorial text-xs font-bold text-espresso sm:text-sm">{reel.title}</p><a aria-label={`Watch ${reel.title} on Instagram`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream text-espresso hover:bg-caramel hover:text-white" href={reel.reel_url} target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-arrow-up-right-from-square text-xs" /></a></div></article>)}
            </div>
          </div>
        </section>

        <section id="why-huddle" data-purpose="brand-story" className="border-b border-borderWarm bg-cream py-14 text-center sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6"><div className="mb-3 flex items-center justify-center gap-6"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-caramel"><i className="fa-solid fa-wheat-awn text-lg" />Baking Daily</span><span className="h-1.5 w-1.5 rounded-full bg-caramel" /><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-caramel"><i className="fa-solid fa-box-open text-lg" />Artisan Boxes</span></div><h2 className="reveal-up font-editorial text-3xl font-bold tracking-tight text-espresso sm:text-4xl">Why Huddle?</h2><p className="reveal-fade mx-auto mt-4 max-w-2xl text-sm font-light leading-relaxed text-espresso/80 sm:text-base">Our signature handcrafted treats are baked fresh daily using pure farm butter, authentic Belgian cocoa, and artisanal precision. From our oven to your doorstep across Punjab.</p><div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-espresso sm:gap-3">{["📍 Faisalabad", "📍 Multan", "📍 Kot Addu", "⚡ Same-Day Delivery"].map((location) => <span key={location} className="stagger-child rounded-full border border-borderWarm bg-sandCard px-3.5 py-1.5">{location}</span>)}</div></div>
        </section>

        <section id="reviews" data-purpose="customer-reviews" className="border-b border-borderWarm bg-creamLight py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="reveal-up mx-auto mb-12 max-w-2xl text-center"><span className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Loved Across Punjab</span><h2 className="mt-1 font-editorial text-3xl font-bold text-espresso sm:text-4xl">Customer Reviews</h2><p className="reveal-fade mt-2 text-sm font-light text-espresso/70">Hear what dessert lovers in Faisalabad, Multan, and Kot Addu have to say.</p></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{[
              ["Ayesha Noor", "The Layered Chocolate Sundae Cups are completely unmatched! Rich chocolate ganache with velvety cream. Arrived chilled and spotless in Faisalabad.", "Faisalabad"],
              ["Hamza Tariq", "Ordered the box of 6 Fudgy Brownies for my family. Incredibly moist, gooey center, and authentic cocoa flavor. WhatsApp ordering was effortless.", "Multan"],
              ["Zainab Raza", "We ordered the Signature Ganache Cake for my sister's birthday in Kot Addu. The presentation was divine and the taste was pure luxury.", "Kot Addu"],
            ].map(([name, text, location]) => <article key={name} className="stagger-child polished-card flex flex-col justify-between rounded-2xl border border-borderWarm bg-sandCard p-6 shadow-warm-soft"><div><div className="mb-3 flex gap-1 text-sm text-caramel" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, i) => <i key={i} className="fa-solid fa-star" />)}</div><p className="text-xs italic leading-relaxed text-espresso/90 sm:text-sm">“{text}”</p></div><div className="mt-6 flex items-center justify-between border-t border-espresso/10 pt-4"><div><h3 className="font-serif text-xs font-bold text-espresso">{name}</h3><p className="text-[10px] text-espresso/60">Verified Customer</p></div><span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-caramelDark">📍 {location}</span></div></article>)}</div>
          </div>
        </section>
      </main>

      <footer id="footer" data-purpose="site-footer" className="border-t border-espressoDark bg-espresso pb-12 pt-16 text-neutral-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-caramel bg-espressoDark font-serif text-lg font-bold text-caramel">H</span><span><span className="block font-serif text-lg font-bold uppercase leading-none tracking-widest text-white">HUDDLE BAKERY</span><span className="mt-1 block text-[9px] uppercase tracking-widest text-caramel">Baked Fresh • Shared Together</span></span></div><p className="text-xs leading-relaxed text-neutral-400">Crafting memorable dessert experiences with love, passion, and premium ingredients across Punjab, Pakistan.</p></div>
          <div className="space-y-3"><h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-white">Menu</h3><ul className="space-y-2 text-xs text-neutral-400">{categories.map((category) => <li key={category}><button className="hover:text-caramel" onClick={() => chooseCategory(category)}>{category}</button></li>)}<li><a className="hover:text-caramel" href="#reels">Watch Reels</a></li></ul></div>
          <div className="space-y-3"><h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-white">Delivery &amp; Contact</h3><ul className="space-y-2 text-xs text-neutral-400"><li>Faisalabad • Multan • Kot Addu</li><li>Same-Day Fast Express Dispatch</li><li className="pt-2"><a className="inline-flex items-center gap-1.5 font-semibold text-caramel hover:underline" href={orderLink} target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp text-sm" />WhatsApp: 0341 7251879</a></li></ul></div>
          <div className="space-y-4"><h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-white">Follow Us</h3><div className="flex items-center gap-3 text-lg">
            {[
              ["https://www.instagram.com/___huddle_?knvt=ZjZxdGNjNGF5aTU=", "fa-instagram", "Instagram"],
              ["https://www.facebook.com/share/19hBa5XXpD/", "fa-facebook-f", "Facebook"],
              ["https://www.tiktok.com/@hoor.fatima836?_r=1&_t=ZS-9BZ7cXFXCfk", "fa-tiktok", "TikTok"],
              [orderLink, "fa-whatsapp", "WhatsApp Direct"],
            ].map(([href, icon, title]) => <a key={title} aria-label={title} title={title} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-espressoDark text-caramel hover:bg-caramel hover:text-espresso" href={href} target="_blank" rel="noopener noreferrer"><i className={`fa-brands ${icon}`} /></a>)}
          </div><p className="text-[11px] text-neutral-400">Order directly via WhatsApp for swift delivery in Punjab.</p></div>
        </div><div className="mt-12 flex flex-col items-center justify-between border-t border-white/10 pt-6 text-xs text-neutral-500 sm:flex-row"><p>© {new Date().getFullYear()} HUDDLE BAKERY. All rights reserved.</p><p className="mt-2 sm:mt-0">Faisalabad • Multan • Kot Addu, Punjab</p><a className="mt-3 text-[10px] text-neutral-500 hover:text-caramel sm:mt-0" href="/admin">Admin</a></div></div>
      </footer>
      <a aria-label="Order on WhatsApp" className="whatsapp-pulse group fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-transform hover:scale-105 sm:bottom-7 sm:right-7" href={orderLink} target="_blank" rel="noopener noreferrer" title="Order on WhatsApp"><i className="fa-brands fa-whatsapp text-2xl" /><span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-espresso px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Order on WhatsApp</span></a>

      {selectedProduct && <div role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="relative flex max-h-[92vh] w-full max-w-[390px] flex-col overflow-hidden rounded-[36px] border-4 border-[#2d2826] bg-[#1a1716] p-2.5 shadow-phone">
          <div className="mx-auto mb-1 h-4 w-24 rounded-b-xl bg-black" /><div className="overflow-y-auto rounded-[28px] border border-borderWarm bg-cream">
            <div className="sticky top-0 z-20 flex items-center justify-between bg-espresso px-4 py-3 text-white"><button aria-label="Close order drawer" onClick={() => setSelectedProduct(null)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/10"><i className="fa-solid fa-chevron-left text-xs" /></button><span className="font-serif text-[11px] font-bold uppercase tracking-wider">HUDDLE BAKERY</span><i className="fa-solid fa-cart-shopping text-xs text-caramel" /></div>
            <div className="space-y-4 p-4"><div className="relative aspect-square overflow-hidden rounded-2xl border border-borderWarm bg-sandCard shadow-sm"><Image alt={selectedProduct.name} unoptimized fill sizes="(max-width: 390px) 100vw, 390px" className="object-cover" src={selectedProduct.image_url} /></div>
              <div className="space-y-1 text-center"><h2 id="drawer-title" className="font-editorial text-xl font-bold leading-snug text-espresso">{selectedProduct.name}</h2><p className="text-xs text-espresso/80">{price(selectedProduct.price)} — Per Unit</p>{selectedProduct.badge && <span className="inline-block rounded-full bg-caramel px-3 py-0.5 text-[10px] font-bold uppercase text-espresso">{selectedProduct.badge}</span>}</div>
              {selectedProduct.flavors && selectedProduct.flavors.length > 0 && <fieldset><legend className="mb-2 text-xs font-semibold">Choose a flavor</legend><div className="flex flex-wrap gap-2">{selectedProduct.flavors.map((flavor) => <button key={flavor} type="button" aria-pressed={selectedFlavor === flavor} onClick={() => setSelectedFlavor(flavor)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${selectedFlavor === flavor ? "border-espresso bg-espresso text-white" : "border-borderWarm bg-white text-espresso"}`}>{flavor}</button>)}</div></fieldset>}
              <div className="flex items-center justify-between rounded-xl border border-borderWarm bg-sandCard/80 p-3"><div><span className="block text-xs font-semibold">Quantity</span><span className="text-[10px] text-espresso/70">Selected units</span></div><div className="flex items-center gap-3"><div className="flex items-center rounded-full border border-borderWarm bg-cream px-2 py-1"><button aria-label="Decrease quantity" onClick={() => { const next = Math.max(1, quantity - 1); setQuantity(next); setCartCount(next); }} className="h-5 w-5 font-bold">−</button><span className="w-7 text-center text-xs font-bold">{quantity}</span><button aria-label="Increase quantity" onClick={() => { const next = quantity + 1; setQuantity(next); setCartCount(next); }} className="h-5 w-5 font-bold">+</button></div><span className="text-sm font-bold">{price(selectedProduct.price * quantity)}</span></div></div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-borderWarm bg-creamLight p-2.5 text-[11px]"><label className="inline-flex items-center gap-2" htmlFor="deliveryCity"><i className="fa-solid fa-location-dot text-caramel" />Delivery city</label><input id="deliveryCity" required maxLength={120} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter your city" className="max-w-[58%] rounded-lg border-borderWarm bg-white px-2 py-1 text-[11px] font-semibold" /></div>
              <div className="space-y-1.5 text-center"><h3 className="font-editorial text-sm font-bold">Description</h3><p className="text-[11px] font-light leading-relaxed text-espresso/80">{selectedProduct.description}</p></div>
              <div className="grid grid-cols-3 gap-2 border-t border-borderWarm pt-2 text-center text-[9px] font-semibold uppercase"><span><i className="fa-solid fa-cookie-bite mb-1 block text-caramel" />Made Fresh Daily</span><span><i className="fa-solid fa-truck-fast mb-1 block text-caramel" />Same-Day Delivery</span><span><i className="fa-solid fa-award mb-1 block text-caramel" />Premium Ingredients</span></div>
              <a className="whatsapp-pulse flex w-full items-center justify-center gap-2 rounded-full bg-caramel py-3 text-xs font-semibold uppercase tracking-wider text-espresso hover:bg-caramelDark" href={orderLink} target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp text-sm" />Buy Now on WhatsApp<i className="fa-solid fa-arrow-right text-[10px]" /></a>
              <div className="rounded-xl border border-borderWarm bg-sandCard p-2 text-center"><a className="block text-[10px] font-bold text-caramelDark hover:underline" href={orderLink} target="_blank" rel="noopener noreferrer">Order via WhatsApp for fastest express dispatch</a></div>
            </div><div className="flex justify-center p-2"><span className="h-1 w-24 rounded-full bg-espresso/30" /></div>
          </div><button aria-label="Close order modal" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-sm text-white hover:bg-espressoDark" onClick={() => setSelectedProduct(null)}><i className="fa-solid fa-xmark" /></button>
        </div>
      </div>}
      {activeReel && <div role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setActiveReel(null); }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="reel-title" className="flex max-h-[95vh] w-full max-w-md flex-col space-y-4 overflow-y-auto rounded-3xl border border-caramel/40 bg-espresso p-5 text-cream shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 pb-3"><h2 id="reel-title" className="font-serif text-sm font-bold text-white"><i className="fa-brands fa-instagram mr-2 text-caramel" />{activeReel.title}</h2><button aria-label="Close reel" onClick={() => setActiveReel(null)}><i className="fa-solid fa-xmark" /></button></div><div className="mx-auto aspect-[9/14] max-h-[60vh] w-full max-w-[360px] overflow-hidden rounded-2xl bg-espressoDark"><iframe className="h-full w-full border-0" title="Instagram reel" src={reelEmbedUrl(activeReel.reel_url)} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" /></div>{activeReel.caption && <p className="text-xs leading-relaxed">{activeReel.caption}</p>}<div className="flex gap-3"><a className="flex-1 rounded-full bg-caramel py-2.5 text-center text-xs font-bold uppercase tracking-wider text-espresso" href={activeReel.reel_url} target="_blank" rel="noopener noreferrer">Watch on Instagram</a><button className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white" onClick={() => setActiveReel(null)}>Close</button></div></div></div>}
    </div>
  );
}
