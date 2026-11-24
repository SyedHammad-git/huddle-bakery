export const FIXED_CATEGORIES = [
  "Sundaes",
  "Brownies & Snownies",
  "Cakes & Cupcakes",
  "Exclusive Deals",
] as const;

export const CATEGORIES = FIXED_CATEGORIES;

export type Category = string;

export type CategoryRecord = {
  id: number;
  name: string;
  is_fixed: boolean;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  regular_price: string | null;
  badge: string | null;
  flavors: string[] | null;
  description: string;
  image_url: string;
  included_items?: string[];
  sort_order: number;
  created_at?: string;
  average_rating?: number;
  review_count?: number;
};

export type ProductInput = Omit<Product, "id" | "created_at">;

export type SaleBanner = {
  id: number;
  badge: string | null;
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
};

export type SaleBannerInput = Omit<SaleBanner, "id" | "created_at">;

export type ProductReview = {
  id: string;
  product_id: string;
  reviewer_name: string;
  city: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type Reel = {
  id: string;
  title: string;
  caption: string | null;
  reel_url: string;
  thumbnail_url: string;
  sort_order: number;
  created_at?: string;
};

export type ReelInput = Omit<Reel, "id" | "created_at">;
