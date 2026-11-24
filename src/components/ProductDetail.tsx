"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product, ProductReview } from "@/lib/types";

const price = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;

type ProductPayload = {
  product: Product;
  reviews: ProductReview[];
  averageRating: number;
  reviewCount: number;
};

function includedItems(product: Product): string[] {
  if (product.included_items?.length) return product.included_items;
  if (product.category !== "Exclusive Deals") return [`1 × ${product.name}`];
  return [product.description];
}

export default function ProductDetail({ id }: { id: string }) {
  const [data, setData] = useState<ProductPayload | null>(null);
  const [error, setError] = useState("");
  const [flavor, setFlavor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [city, setCity] = useState("Faisalabad");
  const [review, setReview] = useState({ reviewer_name: "", city: "", rating: 5, comment: "" });
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [boxMessage, setBoxMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ProductPayload & { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to load this product.");
        if (active) {
          setData(result);
          setFlavor(result.product.flavors?.[0] ?? "");
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this product.");
      });
    return () => { active = false; };
  }, [id]);

  const orderLink = useMemo(() => {
    if (!data) return "#";
    const text = `Hi Huddle Bakery! I would like to order:\n- Item: ${data.product.name}${flavor ? ` (${flavor})` : ""}\n- Quantity: ${quantity}\n- Subtotal: ${price(data.product.price * quantity)}\n- Delivery Destination: ${city}`;
    return `https://wa.me/923417251879?text=${encodeURIComponent(text)}`;
  }, [city, data, flavor, quantity]);

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!data) return;
    setReviewBusy(true);
    setReviewMessage("");
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(id)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(review),
      });
      const result = await response.json() as ProductReview & { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to submit your review.");
      const reviews = [result, ...data.reviews];
      setData({
        ...data,
        reviews,
        reviewCount: reviews.length,
        averageRating: reviews.reduce((total, entry) => total + entry.rating, 0) / reviews.length,
      });
      setReview({ ...review, reviewer_name: "", comment: "" });
      setReviewMessage("Thank you — your review has been added.");
    } catch (reason) {
      setReviewMessage(reason instanceof Error ? reason.message : "Unable to submit your review.");
    } finally {
      setReviewBusy(false);
    }
  };

  const addToBox = () => {
    if (!data) return;
    try {
      const existing = JSON.parse(localStorage.getItem("huddle-order-box") || "[]") as Array<{ productId: string; name: string; flavor: string; quantity: number; city: string }>;
      existing.push({ productId: id, name: data.product.name, flavor, quantity, city });
      localStorage.setItem("huddle-order-box", JSON.stringify(existing));
      setBoxMessage(`${quantity} × ${data.product.name} added to your box.`);
    } catch {
      setBoxMessage("Your browser could not save the order box. Please use Buy Now on WhatsApp.");
    }
  };

  if (error) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-4 text-center text-espresso"><p role="alert">{error}</p><Link className="text-caramelDark underline" href="/">Return to the menu</Link></main>;
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-cream text-espresso">Loading product…</main>;

  const product = data.product;
  return <main className="min-h-screen bg-creamLight text-espresso">
    <header className="sticky top-0 z-30 bg-espresso text-white shadow-md"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><Link className="font-serif font-bold tracking-widest" href="/">HUDDLE BAKERY</Link><Link href="/#menu" className="text-xs font-semibold text-caramel hover:underline">← Back to menu</Link></div></header>
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-3xl border border-borderWarm bg-sandCard shadow-warm-soft"><Image src={product.image_url} alt={product.name} fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></div>
        <section className="flex flex-col justify-center">
          <div className="flex flex-wrap gap-2"><span className="rounded-full bg-sandCard px-3 py-1 text-[11px] font-semibold">{product.category}</span>{product.badge && <span className="rounded-full bg-caramel px-3 py-1 text-[11px] font-bold uppercase">{product.badge}</span>}</div>
          <h1 className="mt-4 font-editorial text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <a href="#product-reviews" className="mt-2 inline-flex items-center gap-2 text-sm text-caramelDark"><span aria-label={`${data.averageRating.toFixed(1)} out of 5 stars`}>★ {data.averageRating.toFixed(1)}</span><span className="text-espresso/60">{data.reviewCount} review{data.reviewCount === 1 ? "" : "s"}</span></a>
          <div className="mt-4 flex items-baseline gap-3"><strong className="text-2xl">{price(product.price)}</strong>{product.regular_price && <del className="text-sm text-espresso/50">Rs {product.regular_price}</del>}</div>
          <p className="mt-5 text-sm leading-7 text-espresso/75">{product.description}</p>
          <div className="mt-5 rounded-2xl border border-borderWarm bg-white/70 p-4"><h2 className="font-serif text-sm font-bold">Included in this box</h2><ul className="mt-2 list-inside list-disc space-y-1 text-sm text-espresso/75">{includedItems(product).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
          {product.flavors && product.flavors.length > 0 && <fieldset className="mt-5"><legend className="mb-2 text-xs font-bold uppercase tracking-wider">Choose a flavor</legend><div className="flex flex-wrap gap-2">{product.flavors.map((option) => <button key={option} type="button" aria-pressed={flavor === option} onClick={() => setFlavor(option)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${flavor === option ? "border-espresso bg-espresso text-white" : "border-borderWarm bg-white"}`}>{option}</button>)}</div></fieldset>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider">Delivery city<input required maxLength={120} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter your city" className="mt-2 block w-full rounded-xl border-borderWarm bg-white px-3 py-3 text-sm font-normal normal-case" /></label><div><span className="block text-xs font-bold uppercase tracking-wider">Quantity</span><div className="mt-2 flex h-[46px] items-center justify-between rounded-xl border border-borderWarm bg-white px-3"><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-8 w-8 rounded-full hover:bg-sandCard">−</button><span className="font-bold tabular-nums">{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="h-8 w-8 rounded-full hover:bg-sandCard">+</button></div></div></div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-sandCard px-4 py-3"><span className="text-sm font-semibold">Subtotal</span><strong className="text-lg">{price(product.price * quantity)}</strong></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={addToBox} className="rounded-full border border-espresso px-5 py-3 text-sm font-bold hover:bg-sandCard">Add to Box</button><a href={orderLink} target="_blank" rel="noopener noreferrer" className="whatsapp-pulse rounded-full bg-caramel px-5 py-3 text-center text-sm font-bold text-espresso hover:bg-caramelDark">Buy Now on WhatsApp</a></div>
          {boxMessage && <p role="status" className="mt-3 text-xs text-caramelDark">{boxMessage}</p>}
        </section>
      </div>
      <section id="product-reviews" className="mt-14 border-t border-borderWarm pt-10">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-caramelDark">Customer feedback</p><h2 className="mt-1 font-editorial text-3xl font-bold">Reviews</h2></div><p className="text-sm text-espresso/70">★ {data.averageRating.toFixed(1)} average · {data.reviewCount} review{data.reviewCount === 1 ? "" : "s"}</p></div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">{data.reviews.length ? data.reviews.map((entry) => <article key={entry.id} className="rounded-2xl border border-borderWarm bg-white p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{entry.reviewer_name}</h3><p className="text-xs text-espresso/55">📍 {entry.city} · {new Date(entry.created_at).toLocaleDateString()}</p></div><span className="whitespace-nowrap text-caramel" aria-label={`${entry.rating} out of 5 stars`}>{"★".repeat(entry.rating)}{"☆".repeat(5 - entry.rating)}</span></div><p className="mt-3 text-sm leading-relaxed text-espresso/75">{entry.comment}</p></article>) : <p className="rounded-2xl border border-borderWarm bg-white p-6 text-sm text-espresso/60">No reviews yet. Be the first to share your experience.</p>}</div>
          <form onSubmit={(event) => void submitReview(event)} className="h-fit rounded-2xl border border-borderWarm bg-sandCard p-5"><h3 className="font-editorial text-xl font-bold">Write a Review</h3><div className="mt-4 space-y-3"><label className="block text-xs font-semibold">Reviewer Name<input required maxLength={100} value={review.reviewer_name} onChange={(event) => setReview({ ...review, reviewer_name: event.target.value })} className="mt-1 w-full rounded-lg border-borderWarm bg-white px-3 py-2.5 text-sm" /></label><label className="block text-xs font-semibold">Your City<input required maxLength={120} placeholder="Enter your city (e.g. Faisalabad, Lahore, Multan, Kot Addu...)" value={review.city} onChange={(event) => setReview({ ...review, city: event.target.value })} className="mt-1 w-full rounded-lg border-borderWarm bg-white px-3 py-2.5 text-sm" /></label><fieldset><legend className="text-xs font-semibold">Rating</legend><div className="mt-1 flex gap-1">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`${rating} star${rating === 1 ? "" : "s"}`} aria-pressed={review.rating === rating} onClick={() => setReview({ ...review, rating })} className={`px-1 text-2xl ${rating <= review.rating ? "text-caramel" : "text-espresso/25"}`}>★</button>)}</div></fieldset><label className="block text-xs font-semibold">Review Comment<textarea required maxLength={2000} rows={4} value={review.comment} onChange={(event) => setReview({ ...review, comment: event.target.value })} className="mt-1 w-full rounded-lg border-borderWarm bg-white px-3 py-2.5 text-sm" /></label><button disabled={reviewBusy} className="w-full rounded-full bg-espresso px-5 py-3 text-sm font-semibold text-white hover:bg-espressoDark disabled:opacity-50">{reviewBusy ? "Submitting…" : "Submit Review"}</button>{reviewMessage && <p role="status" className="text-xs text-caramelDark">{reviewMessage}</p>}</div></form>
        </div>
      </section>
    </div>
  </main>;
}
