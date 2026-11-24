"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { type Category, type CategoryRecord, type Product, type ProductInput, type Reel, type ReelInput, type SaleBanner, type SaleBannerInput } from "@/lib/types";

const emptyProduct: ProductInput = {
  name: "",
  category: "Sundaes",
  price: 0,
  regular_price: null,
  badge: null,
  flavors: [],
  description: "",
  image_url: "",
  included_items: [],
  sort_order: 0,
};
const emptyBanner: SaleBannerInput = {
  badge: null, title: "", description: null, cta_text: null, cta_link: null,
  image_url: null, is_active: true, sort_order: 0,
};

async function compressImageFile(file: File, maxWidth = 1200): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WEBP image.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The selected image could not be opened."));
    });
    const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    const output = webp?.type === "image/webp" ? webp
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!output) throw new Error("Your browser could not compress the image.");
    if (output.size > 3 * 1024 * 1024) throw new Error("Compressed image exceeds 3 MB. Choose a smaller image.");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image encoding failed."));
      reader.onerror = () => reject(new Error("Image encoding failed."));
      reader.readAsDataURL(output);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  return body.error || "The request could not be completed.";
}

export default function AdminPortal() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [banners, setBanners] = useState<SaleBanner[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "banners" | "categories" | "reels" | "security">("catalog");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [editing, setEditing] = useState<Product | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyProduct);
  const [flavorsText, setFlavorsText] = useState("");
  const [includedItemsText, setIncludedItemsText] = useState("");
  const [security, setSecurity] = useState({ currentPassword: "", newUsername: "", newPassword: "", confirmPassword: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [bannerEditing, setBannerEditing] = useState<SaleBanner | null>(null);
  const [bannerFormOpen, setBannerFormOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState<SaleBannerInput>(emptyBanner);
  const [inlineCategoryName, setInlineCategoryName] = useState("");
  const [bannerImageBusy, setBannerImageBusy] = useState(false);
  const [reelEditing, setReelEditing] = useState<Reel | null>(null);
  const [reelFormOpen, setReelFormOpen] = useState(false);
  const [reelForm, setReelForm] = useState<ReelInput>({ title: "", caption: null, reel_url: "", thumbnail_url: "", sort_order: 0 });
  const [reelImageBusy, setReelImageBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setProducts(await response.json() as Product[]);
  }, []);
  const loadCategories = useCallback(async () => {
    const response = await fetch("/api/categories", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setCategories(await response.json() as CategoryRecord[]);
  }, []);
  const loadBanners = useCallback(async () => {
    const response = await fetch("/api/banners?all=1", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setBanners(await response.json() as SaleBanner[]);
  }, []);
  const loadReels = useCallback(async () => {
    const response = await fetch("/api/reels", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseError(response));
    setReels(await response.json() as Reel[]);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session").then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const session = await response.json() as { authenticated: boolean; username: string | null };
      setAuthenticated(session.authenticated);
      setUsername(session.username ?? "");
      if (session.authenticated) await Promise.all([loadProducts(), loadCategories(), loadBanners(), loadReels()]);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to verify your session."))
      .finally(() => setChecking(false));
  }, [loadBanners, loadCategories, loadProducts, loadReels]);

  const visibleProducts = useMemo(() => products.filter((product) =>
    (category === "All categories" || product.category === category)
    && `${product.name} ${product.description} ${product.badge ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  ), [products, category, query]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setAuthenticated(true); setUsername(loginUsername); setLoginPassword("");
      await Promise.all([loadProducts(), loadCategories(), loadBanners(), loadReels()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(await responseError(response));
      setAuthenticated(false); setProducts([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign out.");
    } finally { setBusy(false); }
  };

  const beginCreate = () => {
    setEditing(null); setForm({ ...emptyProduct, sort_order: products.length });
    setProductFormOpen(true);
    setFlavorsText(""); setError(""); setNotice("");
    setIncludedItemsText("");
  };
  const beginEdit = (product: Product) => {
    setEditing(product);
    setProductFormOpen(true);
    setForm({
      name: product.name, category: product.category, price: product.price,
      regular_price: product.regular_price, badge: product.badge, flavors: product.flavors,
      description: product.description, image_url: product.image_url, sort_order: product.sort_order,
    });
    setFlavorsText(product.flavors?.join(", ") ?? ""); setError(""); setNotice("");
    setIncludedItemsText(product.included_items?.join("\n") ?? "");
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const payload: ProductInput = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim(),
      regular_price: form.regular_price?.trim() || null,
      badge: form.badge?.trim() || null,
      flavors: flavorsText.split(",").map((flavor) => flavor.trim()).filter(Boolean),
      included_items: includedItemsText.split("\n").map((item) => item.trim()).filter(Boolean),
      price: Number(form.price),
      sort_order: Number(form.sort_order),
    };
    try {
      const response = await fetch("/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...payload, id: editing.id } : payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await loadProducts();
      setEditing(null); setProductFormOpen(false);
      setNotice(editing ? "Product updated." : "Product added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save product.");
    } finally { setBusy(false); }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Permanently delete "${product.name}"?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/products?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      setNotice(`${product.name} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete product.");
    }
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError(""); setNotice(""); setUploading(true);
    let objectUrl: string | undefined;
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Choose a JPG, PNG, or WEBP image.");
      }
      if (file.size > 15 * 1024 * 1024) throw new Error("Choose an image smaller than 15 MB.");
      objectUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("The selected image could not be opened."));
      });
      const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const webpBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
      const blob = webpBlob?.type === "image/webp"
        ? webpBlob
        : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob) throw new Error("Your browser could not compress the image.");
      if (blob.size > 3 * 1024 * 1024) throw new Error("Compressed image exceeds 3 MB. Choose a smaller image.");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image encoding failed."));
        reader.onerror = () => reject(new Error("Image encoding failed."));
        reader.readAsDataURL(blob);
      });
      setForm((current) => ({ ...current, image_url: dataUrl }));
      setNotice("Image compressed and ready to save with this product.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload image.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploading(false);
    }
  };

  const changeCredentials = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(security),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result = await response.json() as { username: string };
      setUsername(result.username);
      setSecurity({ currentPassword: "", newUsername: "", newPassword: "", confirmPassword: "" });
      setNotice("Admin credentials updated. Use the new username and password next time you sign in.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to change credentials.");
    } finally { setBusy(false); }
  };

  const saveCategory = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setNewCategory("");
      await loadCategories();
      setNotice("Category added and available in the storefront.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add category.");
    } finally { setBusy(false); }
  };

  const addInlineCategory = async () => {
    setError(""); setNotice(""); setBusy(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inlineCategoryName }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const created = await response.json() as CategoryRecord;
      await loadCategories();
      setForm((current) => ({ ...current, category: created.name }));
      setInlineCategoryName("");
      setNotice("Category added and selected for this product.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add category.");
    } finally { setBusy(false); }
  };

  const deleteCategory = async (category: CategoryRecord) => {
    if (category.is_fixed || !window.confirm(`Delete category "${category.name}"?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/categories?id=${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      await loadCategories();
      setNotice(`${category.name} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete category.");
    }
  };

  const beginBannerCreate = () => {
    setBannerEditing(null); setBannerForm({ ...emptyBanner, sort_order: banners.length });
    setBannerFormOpen(true); setError(""); setNotice("");
  };
  const beginBannerEdit = (banner: SaleBanner) => {
    setBannerEditing(banner);
    setBannerForm({
      badge: banner.badge, title: banner.title, description: banner.description,
      cta_text: banner.cta_text, cta_link: banner.cta_link, image_url: banner.image_url,
      is_active: banner.is_active, sort_order: banner.sort_order,
    });
    setBannerFormOpen(true); setError(""); setNotice("");
  };
  const uploadBannerImage = async (file?: File) => {
    if (!file) return;
    setBannerImageBusy(true); setError(""); setNotice("");
    try {
      const image = await compressImageFile(file, 900);
      setBannerForm((current) => ({ ...current, image_url: image }));
      setNotice("Banner image compressed and ready to save.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload banner image.");
    } finally { setBannerImageBusy(false); }
  };
  const saveBanner = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const payload: SaleBannerInput = {
      ...bannerForm,
      badge: bannerForm.badge?.trim() || null,
      title: bannerForm.title.trim(),
      description: bannerForm.description?.trim() || null,
      cta_text: bannerForm.cta_text?.trim() || null,
      cta_link: bannerForm.cta_link?.trim() || null,
      image_url: bannerForm.image_url?.trim() || null,
      sort_order: Number(bannerForm.sort_order),
    };
    try {
      const response = await fetch("/api/banners", {
        method: bannerEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bannerEditing ? { ...payload, id: bannerEditing.id } : payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await loadBanners();
      setBannerFormOpen(false); setBannerEditing(null);
      setNotice(bannerEditing ? "Banner updated." : "Banner added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save banner.");
    } finally { setBusy(false); }
  };
  const toggleBanner = async (banner: SaleBanner) => {
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...banner, is_active: !banner.is_active }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await loadBanners();
      setNotice(`Banner ${banner.is_active ? "paused" : "activated"}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update banner status.");
    }
  };
  const deleteBanner = async (banner: SaleBanner) => {
    if (!window.confirm(`Permanently delete "${banner.title}"?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/banners?id=${banner.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setBanners((current) => current.filter((entry) => entry.id !== banner.id));
      setNotice(`${banner.title} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete banner.");
    }
  };

  const beginReelCreate = () => {
    setReelEditing(null);
    setReelForm({ title: "", caption: null, reel_url: "", thumbnail_url: "", sort_order: reels.length });
    setReelFormOpen(true); setError(""); setNotice("");
  };
  const beginReelEdit = (reel: Reel) => {
    setReelEditing(reel);
    setReelForm({
      title: reel.title, caption: reel.caption, reel_url: reel.reel_url,
      thumbnail_url: reel.thumbnail_url, sort_order: reel.sort_order,
    });
    setReelFormOpen(true); setError(""); setNotice("");
  };
  const uploadReelThumbnail = async (file?: File) => {
    if (!file) return;
    setReelImageBusy(true); setError(""); setNotice("");
    try {
      const image = await compressImageFile(file);
      setReelForm((current) => ({ ...current, thumbnail_url: image }));
      setNotice("Reel thumbnail compressed and ready to save.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to upload Reel thumbnail.");
    } finally { setReelImageBusy(false); }
  };
  const saveReel = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const payload: ReelInput = {
      ...reelForm,
      title: reelForm.title.trim(),
      caption: reelForm.caption?.trim() || null,
      reel_url: reelForm.reel_url.trim(),
      thumbnail_url: reelForm.thumbnail_url.trim(),
      sort_order: Number(reelForm.sort_order),
    };
    try {
      const response = await fetch(reelEditing ? `/api/reels/${reelEditing.id}` : "/api/reels", {
        method: reelEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await loadReels();
      setReelFormOpen(false); setReelEditing(null);
      setNotice(reelEditing ? "Reel updated." : "Reel added.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save Reel.");
    } finally { setBusy(false); }
  };
  const deleteReel = async (reel: Reel) => {
    if (!window.confirm(`Permanently delete "${reel.title}"?`)) return;
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/reels/${reel.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setReels((current) => current.filter((entry) => entry.id !== reel.id));
      setNotice(`${reel.title} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete Reel.");
    }
  };

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-cream text-espresso">Loading admin portal…</div>;

  return <main className="min-h-screen bg-creamLight text-espresso">
    <header className="border-b border-borderWarm bg-espresso text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-caramel font-serif text-lg font-bold text-caramel">H</span><span><span className="block font-serif font-bold tracking-widest">HUDDLE BAKERY</span><span className="block text-[9px] uppercase tracking-[.25em] text-caramel">Admin Portal</span></span></Link>
      {authenticated && <div className="flex items-center gap-3 text-xs"><span className="hidden text-neutral-300 sm:inline">Signed in as <strong className="text-caramel">{username}</strong></span><button disabled={busy} onClick={() => void signOut()} className="rounded-full border border-caramel/50 px-4 py-2 text-caramel hover:bg-caramel hover:text-espresso disabled:opacity-50">Logout</button></div>}
    </div></header>
    {!authenticated ? <section className="mx-auto max-w-md px-4 py-16 sm:py-24"><div className="rounded-3xl border border-borderWarm bg-white p-7 shadow-warm-soft sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Staff access</p><h1 className="mt-2 font-editorial text-3xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-espresso/65">Sign in to manage your menu and deals.</p>
      <form className="mt-7 space-y-4" onSubmit={(event) => void signIn(event)}><label className="block text-xs font-semibold">Username<input required autoComplete="username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} className="mt-1.5 w-full rounded-xl border-borderWarm bg-creamLight px-4 py-3 text-sm focus:border-caramel focus:ring-caramel" /></label><label className="block text-xs font-semibold">Password<input required type="password" autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border-borderWarm bg-creamLight px-4 py-3 text-sm focus:border-caramel focus:ring-caramel" /></label><button disabled={busy} className="w-full rounded-full bg-espresso py-3 text-sm font-semibold text-white hover:bg-espressoDark disabled:opacity-50">{busy ? "Signing in…" : "Sign in securely"}</button></form>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <Link className="mt-6 inline-block text-xs text-caramelDark hover:underline" href="/">← Back to storefront</Link>
    </div></section> : <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Bakery management</p><h1 className="mt-1 font-editorial text-3xl font-bold">Menu &amp; Deals</h1><p className="mt-1 text-sm text-espresso/65">Changes are saved to your Neon database.</p></div><Link href="/" className="text-xs font-semibold text-caramelDark hover:underline">View storefront ↗</Link></div>
      <div className="mt-7 flex gap-2 overflow-x-auto border-b border-borderWarm">{([
        ["catalog", "Catalog"], ["banners", "Banners"], ["categories", "Categories"], ["reels", "Reels"], ["security", "Security"],
      ] as const).map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab ? "border-caramel text-espresso" : "border-transparent text-espresso/55"}`}>{label}</button>)}</div>
      {notice && <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {activeTab === "catalog" ? <div className="mt-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row"><input aria-label="Search products" placeholder="Search menu…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 rounded-xl border-borderWarm bg-white px-4 py-3 text-sm focus:border-caramel focus:ring-caramel" /><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border-borderWarm bg-white px-4 py-3 text-sm focus:border-caramel focus:ring-caramel"><option>All categories</option>{categories.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select><button onClick={beginCreate} className="rounded-xl bg-espresso px-5 py-3 text-sm font-semibold text-white hover:bg-espressoDark"><i className="fa-solid fa-plus mr-2" />Add new item</button></div>
        <div className="overflow-hidden rounded-2xl border border-borderWarm bg-white shadow-warm-soft"><div className="hidden grid-cols-[72px_1.2fr_1fr_90px_1.5fr_120px] gap-4 bg-sandCard px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-espresso/65 md:grid"><span>Image</span><span>Product</span><span>Category</span><span>Price</span><span>Description</span><span>Actions</span></div>
          {visibleProducts.length ? visibleProducts.map((product) => <article key={product.id} className="grid gap-3 border-t border-borderWarm p-4 first:border-t-0 md:grid-cols-[72px_1.2fr_1fr_90px_1.5fr_120px] md:items-center md:gap-4 md:px-5"><Image width={64} height={64} unoptimized className="h-16 w-16 rounded-xl border border-borderWarm bg-sandCard object-cover" src={product.image_url} alt="" /><div><h2 className="font-semibold">{product.name}</h2><p className="mt-1 text-[11px] text-espresso/55">{product.badge || "No badge"}{product.regular_price ? ` · Regular Rs ${product.regular_price}` : ""}</p></div><p className="text-xs text-espresso/70">{product.category}</p><p className="font-semibold tabular-nums">Rs {product.price.toLocaleString("en-PK")}</p><p className="line-clamp-2 text-xs leading-relaxed text-espresso/65">{product.description}</p><div className="flex gap-2"><button onClick={() => beginEdit(product)} className="rounded-lg border border-borderWarm px-3 py-2 text-xs font-semibold hover:bg-cream">Edit</button><button onClick={() => void deleteProduct(product)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button></div></article>) : <p className="p-8 text-center text-sm text-espresso/60">No products match your search.</p>}
        </div><p className="mt-3 text-xs text-espresso/55">{visibleProducts.length} of {products.length} items</p>
      </div> : activeTab === "banners" ? <section className="mt-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-editorial text-2xl font-bold">Sale banner carousel</h2><p className="mt-1 text-xs text-espresso/60">Active banners with a title appear on the storefront; images are optional.</p></div><button onClick={beginBannerCreate} className="rounded-xl bg-espresso px-4 py-3 text-xs font-semibold text-white hover:bg-espressoDark"><i className="fa-solid fa-plus mr-2" />Add banner</button></div>
        <div className="space-y-3">{banners.length ? banners.map((banner) => <article key={banner.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-borderWarm bg-white p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start gap-4">{banner.image_url && <Image width={112} height={72} unoptimized src={banner.image_url} alt="" className="h-[72px] w-28 shrink-0 rounded-lg border border-borderWarm object-cover" />}
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{banner.badge && <span className="rounded-full bg-caramel/20 px-2 py-1 text-[10px] font-bold uppercase text-caramelDark">{banner.badge}</span>}<h3 className="font-semibold">{banner.title}</h3><span className="rounded-full bg-cream px-2 py-1 text-[10px] uppercase">Order {banner.sort_order}</span></div>
              {banner.description && <p className="mt-1 line-clamp-2 text-xs text-espresso/65">{banner.description}</p>}
              <p className="mt-1 truncate text-xs text-espresso/65">{banner.cta_text ? `Button: ${banner.cta_text}` : "No button"}{banner.cta_link ? ` · ${banner.cta_link}` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold"><span>{banner.is_active ? "Active" : "Hidden"}</span><input type="checkbox" role="switch" aria-label={`${banner.is_active ? "Hide" : "Activate"} ${banner.title}`} checked={banner.is_active} onChange={() => void toggleBanner(banner)} className="peer sr-only" /><span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${banner.is_active ? "bg-green-600" : "bg-espresso/25"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${banner.is_active ? "translate-x-[22px]" : "translate-x-0.5"}`} /></span></label>
            <button onClick={() => beginBannerEdit(banner)} className="rounded-lg border border-borderWarm px-3 py-2 text-xs font-semibold">Edit</button><button onClick={() => void deleteBanner(banner)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
          </div>
        </article>) : <p className="rounded-2xl border border-borderWarm bg-white p-8 text-center text-sm text-espresso/60">No banners created yet.</p>}</div>
      </section> : activeTab === "categories" ? <section className="mt-6">
        <h2 className="font-editorial text-2xl font-bold">Product categories</h2><p className="mt-1 text-xs text-espresso/60">Fixed categories are protected. Remove products from a custom category before deleting it.</p>
        <form onSubmit={(event) => void saveCategory(event)} className="mt-5 flex flex-col gap-3 sm:flex-row"><input required maxLength={80} aria-label="New category name" placeholder="New category name" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} className="min-w-0 flex-1 rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /><button disabled={busy} className="rounded-xl bg-espresso px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Adding…" : "Add category"}</button></form>
        <div className="mt-5 overflow-hidden rounded-2xl border border-borderWarm bg-white">{categories.map((entry) => <article key={entry.id} className="flex items-center justify-between gap-3 border-t border-borderWarm p-4 first:border-t-0"><div><h3 className="text-sm font-semibold">{entry.name}</h3><p className="text-[10px] uppercase tracking-wider text-espresso/50">{entry.is_fixed ? "Fixed category" : "Custom category"}</p></div>{!entry.is_fixed && <button onClick={() => void deleteCategory(entry)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>}</article>)}</div>
      </section> : activeTab === "reels" ? <section className="mt-6">
        <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-editorial text-2xl font-bold">Instagram Reels</h2><p className="mt-1 text-xs text-espresso/60">Reels are saved to Neon and shown live in the storefront.</p></div><button onClick={beginReelCreate} className="rounded-xl bg-espresso px-4 py-3 text-xs font-semibold text-white hover:bg-espressoDark"><i className="fa-solid fa-plus mr-2" />Add a Reel</button></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-5">{reels.length ? reels.map((reel) => <article key={reel.id} className="overflow-hidden rounded-xl border border-borderWarm bg-sandCard p-2.5 sm:p-3"><Image width={360} height={240} unoptimized src={reel.thumbnail_url} alt="" className="aspect-square w-full rounded-lg object-cover" /><h3 className="mt-2 line-clamp-1 text-sm font-semibold">{reel.title}</h3><p className="mt-1 line-clamp-1 text-[10px] text-espresso/55">{reel.reel_url}</p><div className="mt-3 flex gap-2"><button onClick={() => beginReelEdit(reel)} className="flex-1 rounded-lg border border-borderWarm px-2 py-2 text-xs font-semibold">Edit</button><button onClick={() => void deleteReel(reel)} className="flex-1 rounded-lg border border-red-200 px-2 py-2 text-xs font-semibold text-red-700">Delete</button></div></article>) : <p className="col-span-full rounded-2xl border border-borderWarm bg-white p-8 text-center text-sm text-espresso/60">No Reels are configured.</p>}</div>
      </section> : <div className="mt-6 max-w-2xl rounded-2xl border border-borderWarm bg-white p-6 shadow-warm-soft sm:p-8"><h2 className="font-editorial text-2xl font-bold">Change admin credentials</h2><p className="mt-2 text-sm text-espresso/65">Confirm your current password before saving new credentials.</p><form className="mt-6 space-y-4" onSubmit={(event) => void changeCredentials(event)}>
        {([
          ["currentPassword", "Current Password", "current-password"],
          ["newUsername", "New Username", "username"],
          ["newPassword", "New Password", "new-password"],
          ["confirmPassword", "Confirm New Password", "new-password"],
        ] as const).map(([field, label, autocomplete]) => <label key={field} className="block text-xs font-semibold">{label}<input required type={field.includes("Password") || field === "currentPassword" ? "password" : "text"} autoComplete={autocomplete} minLength={field.includes("Password") ? 10 : undefined} value={security[field]} onChange={(event) => setSecurity((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5 w-full rounded-xl border-borderWarm bg-creamLight px-4 py-3 text-sm focus:border-caramel focus:ring-caramel" /></label>)}
        <button disabled={busy} className="rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-white hover:bg-espressoDark disabled:opacity-50">{busy ? "Saving…" : "Update credentials"}</button>
      </form></div>}
    </section>}

    {authenticated && bannerFormOpen && <div onClick={(event) => { if (event.target === event.currentTarget) { setBannerFormOpen(false); setBannerEditing(null); } }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="banner-form-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-creamLight p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Storefront carousel</p><h2 id="banner-form-title" className="mt-1 font-editorial text-2xl font-bold">{bannerEditing ? "Edit banner" : "Create banner"}</h2></div><button aria-label="Close form" onClick={() => { setBannerFormOpen(false); setBannerEditing(null); }} className="rounded-full p-2 hover:bg-sandCard"><i className="fa-solid fa-xmark" /></button></div>
      <form className="mt-6 space-y-4" onSubmit={(event) => void saveBanner(event)}>
        <label className="block text-xs font-semibold">Badge / Tag (Optional)<input maxLength={80} value={bannerForm.badge ?? ""} onChange={(event) => setBannerForm({ ...bannerForm, badge: event.target.value || null })} placeholder="FLASH SALE" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Banner Title (Required)<input required maxLength={160} value={bannerForm.title} onChange={(event) => setBannerForm({ ...bannerForm, title: event.target.value })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Description (Optional)<textarea rows={4} maxLength={5000} value={bannerForm.description ?? ""} onChange={(event) => setBannerForm({ ...bannerForm, description: event.target.value || null })} placeholder="Share offer details, dates, or terms…" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Button Text (Optional)<input maxLength={80} value={bannerForm.cta_text ?? ""} onChange={(event) => setBannerForm({ ...bannerForm, cta_text: event.target.value || null })} placeholder="Order Now" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label><label className="block text-xs font-semibold">Button Link (Optional)<input value={bannerForm.cta_link ?? ""} onChange={(event) => setBannerForm({ ...bannerForm, cta_link: event.target.value || null })} placeholder="#menu or https://…" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label></div>
        <div>
          <p className="text-xs font-semibold">Banner Image (Optional)</p>
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void uploadBannerImage(event.dataTransfer.files[0]); }} className="mt-1.5 rounded-2xl border-2 border-dashed border-borderWarm bg-white p-4">
            <div className="flex flex-wrap items-center gap-4">
              {bannerForm.image_url && <Image width={160} height={96} unoptimized src={bannerForm.image_url} alt="Banner preview" className="h-24 w-40 rounded-xl border border-borderWarm object-cover" />}
              <div className="flex-1"><label className="inline-flex cursor-pointer items-center rounded-full border border-borderWarm bg-creamLight px-4 py-2 text-xs font-semibold hover:bg-sandCard"><i className="fa-solid fa-cloud-arrow-up mr-2 text-caramelDark" />{bannerImageBusy ? "Compressing…" : "Choose image"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={bannerImageBusy} onChange={(event) => { void uploadBannerImage(event.target.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" /></label><p className="mt-2 text-[11px] text-espresso/55">Drop an image here or choose a PNG, JPEG, or WebP file. It will be compressed to a maximum width of 900px.</p></div>
              {bannerForm.image_url && <button type="button" onClick={() => setBannerForm((current) => ({ ...current, image_url: null }))} className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Remove Image</button>}
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold">Display order<input required min="0" type="number" value={bannerForm.sort_order} onChange={(event) => setBannerForm({ ...bannerForm, sort_order: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label><label className="flex items-center gap-2 self-end pb-3 text-xs font-semibold"><input type="checkbox" checked={bannerForm.is_active} onChange={(event) => setBannerForm({ ...bannerForm, is_active: event.target.checked })} className="rounded border-borderWarm text-caramel focus:ring-caramel" />Active / Hidden</label></div>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => { setBannerFormOpen(false); setBannerEditing(null); }} className="rounded-full border border-borderWarm px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={busy || bannerImageBusy} className="rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save banner"}</button></div>
      </form>
    </div></div>}

    {authenticated && reelFormOpen && <div onClick={(event) => { if (event.target === event.currentTarget) { setReelFormOpen(false); setReelEditing(null); } }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="reel-form-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-creamLight p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Instagram media</p><h2 id="reel-form-title" className="mt-1 font-editorial text-2xl font-bold">{reelEditing ? "Edit Reel" : "Add a Reel"}</h2></div><button aria-label="Close form" onClick={() => { setReelFormOpen(false); setReelEditing(null); }} className="rounded-full p-2 hover:bg-sandCard"><i className="fa-solid fa-xmark" /></button></div>
      <form className="mt-6 space-y-4" onSubmit={(event) => void saveReel(event)}>
        <label className="block text-xs font-semibold">Reel Title<input required maxLength={160} value={reelForm.title} onChange={(event) => setReelForm({ ...reelForm, title: event.target.value })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Caption<textarea rows={3} value={reelForm.caption ?? ""} onChange={(event) => setReelForm({ ...reelForm, caption: event.target.value || null })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Instagram Reel/Post URL<input type="url" required value={reelForm.reel_url} onChange={(event) => setReelForm({ ...reelForm, reel_url: event.target.value })} placeholder="https://www.instagram.com/reel/…" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Thumbnail image URL<input value={reelForm.thumbnail_url.startsWith("data:image/") ? "" : reelForm.thumbnail_url} onChange={(event) => setReelForm({ ...reelForm, thumbnail_url: event.target.value })} placeholder="https://…" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-full border border-borderWarm bg-white px-4 py-2 text-xs font-semibold hover:bg-sandCard"><i className="fa-solid fa-cloud-arrow-up mr-2 text-caramelDark" />{reelImageBusy ? "Compressing…" : "Upload thumbnail"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={reelImageBusy} onChange={(event) => { void uploadReelThumbnail(event.target.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" /></label><span className="text-[11px] text-espresso/55">Canvas-compressed to WebP/JPEG, up to 3 MB</span>{reelForm.thumbnail_url && <Image width={56} height={56} unoptimized src={reelForm.thumbnail_url} alt="Thumbnail preview" className="h-14 w-14 rounded-lg border border-borderWarm object-cover" />}</div>
        <label className="block text-xs font-semibold">Display order<input required min="0" type="number" value={reelForm.sort_order} onChange={(event) => setReelForm({ ...reelForm, sort_order: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="flex justify-end gap-3"><button type="button" onClick={() => { setReelFormOpen(false); setReelEditing(null); }} className="rounded-full border border-borderWarm px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={busy || reelImageBusy || !reelForm.thumbnail_url.trim()} className="rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save Reel"}</button></div>
      </form>
    </div></div>}

    {authenticated && productFormOpen && <div onClick={(event) => { if (event.target === event.currentTarget) { setProductFormOpen(false); setEditing(null); } }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="product-form-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-creamLight p-6 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">{editing ? "Update catalog" : "Expand your menu"}</p><h2 id="product-form-title" className="mt-1 font-editorial text-2xl font-bold">{editing ? "Edit item" : "Add a new item"}</h2></div><button aria-label="Close form" onClick={() => { setProductFormOpen(false); setEditing(null); }} className="rounded-full p-2 hover:bg-sandCard"><i className="fa-solid fa-xmark" /></button></div>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void saveProduct(event)}>
        <label className="block text-xs font-semibold sm:col-span-2">Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="text-xs font-semibold">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm">{categories.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select><div className="mt-2 flex gap-2"><input aria-label="New product category" maxLength={80} value={inlineCategoryName} onChange={(event) => setInlineCategoryName(event.target.value)} placeholder="Add a category" className="min-w-0 flex-1 rounded-lg border-borderWarm bg-white px-3 py-2 text-xs font-normal" /><button type="button" disabled={busy || !inlineCategoryName.trim()} onClick={() => void addInlineCategory()} className="rounded-lg border border-borderWarm px-3 py-2 text-xs font-semibold disabled:opacity-50">Add</button></div></div>
        <label className="block text-xs font-semibold">Price (Rs)<input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Regular price (optional)<input value={form.regular_price ?? ""} onChange={(event) => setForm({ ...form, regular_price: event.target.value || null })} placeholder="e.g. 1,840–1,920" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold">Badge (optional)<input value={form.badge ?? ""} onChange={(event) => setForm({ ...form, badge: event.target.value || null })} placeholder="BESTSELLER" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold sm:col-span-2">Flavor options (comma-separated)<input value={flavorsText} onChange={(event) => setFlavorsText(event.target.value)} placeholder="Vanilla, Chocolate" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold sm:col-span-2">Description<textarea required rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <label className="block text-xs font-semibold sm:col-span-2">Included items (one per line)<textarea rows={3} value={includedItemsText} onChange={(event) => setIncludedItemsText(event.target.value)} placeholder="1 Sundae&#10;2 Brownies" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="sm:col-span-2"><label className="block text-xs font-semibold">Image URL or path<input required value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} placeholder="https://… or ./images/product.jpg" className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label><div className="mt-3 flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-full border border-borderWarm bg-white px-4 py-2 text-xs font-semibold hover:bg-sandCard"><i className="fa-solid fa-cloud-arrow-up mr-2 text-caramelDark" />{uploading ? "Compressing…" : "Upload JPG / PNG / WEBP"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} className="sr-only" /></label><span className="text-[11px] text-espresso/55">Resized to 900px; compressed to WebP or JPEG (up to 3 MB)</span>{form.image_url && <Image width={56} height={56} unoptimized alt="Image preview" src={form.image_url} className="h-14 w-14 rounded-lg border border-borderWarm bg-sandCard object-cover" />}</div></div>
        <label className="block text-xs font-semibold">Display order<input required type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border-borderWarm bg-white px-4 py-3 text-sm" /></label>
        <div className="flex items-end justify-end gap-3"><button type="button" onClick={() => { setProductFormOpen(false); setEditing(null); }} className="rounded-full border border-borderWarm px-5 py-3 text-sm font-semibold">Cancel</button><button disabled={busy || uploading} className="rounded-full bg-espresso px-6 py-3 text-sm font-semibold text-white hover:bg-espressoDark disabled:opacity-50">{busy ? "Saving…" : "Save item"}</button></div>
      </form>
    </div></div>}
    <footer className="border-t border-borderWarm px-4 py-5 text-center text-[11px] text-espresso/55">HUDDLE BAKERY · Secure administration</footer>
  </main>;
}
