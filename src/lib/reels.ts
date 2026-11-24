import type { ReelInput } from "@/lib/types";

export function isInstagramUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "instagram.com" || url.hostname === "www.instagram.com")
      && /^\/(?:reel|p)\/[\w-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function isThumbnail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 4_500_000
    && (value.startsWith("/") && !value.startsWith("//")
      || /^https?:\/\/\S+$/i.test(value)
      || /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
}

export function isValidReel(value: unknown): value is ReelInput {
  if (!value || typeof value !== "object") return false;
  const reel = value as Record<string, unknown>;
  return typeof reel.title === "string" && reel.title.trim().length > 0 && reel.title.length <= 160
    && (reel.caption === null || typeof reel.caption === "string")
    && isInstagramUrl(reel.reel_url)
    && isThumbnail(reel.thumbnail_url)
    && Number.isInteger(reel.sort_order) && Number(reel.sort_order) >= 0;
}

export const seedReels: ReelInput[] = [
  {
    title: "Fresh Ganache Drizzle & Layering",
    caption: "Watch the handcrafted layering of our signature dessert cups with rich Belgian chocolate ganache.",
    reel_url: "https://www.instagram.com/reel/DcxYarNNEVw/?fqnt=MTFobGhmaWhtcGhpdg==",
    thumbnail_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBiWP6SALojSkhkQzFJG-TFurq8dycIBuzk9AimDrm449vOYvOyjAw8FgRNiZMCD2KfF3bJqOhCmlIJTchLa644AUTCjt2Dw5UxD2Ur0GPFsDH-X2cY_E1geAf98c34sLjd3hdECFIcKmnuGl4M3pL1uNmkWhkWRcStpXLieiYw1nCJDxecy5X8g2H2mzUFyJws-YCVQe1kizh-S61y8R2edyP4jz6CGgEvJBd15Sk",
    sort_order: 0,
  },
  {
    title: "Baking Daily Batches & Box Packaging",
    caption: "Step inside our kitchen as we pack fresh artisan brownie boxes and sundae combinations for same-day delivery.",
    reel_url: "https://www.instagram.com/p/DdHZF8CDX-s/?img_index=5&lqvp=YmhnNHAyZjl5Z2xh",
    thumbnail_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuB2Ci24DQADFhZkPIsPES4qgpOK8UAszKo-HDqik3LFbpK12G76B-mU7VUO8iD4Z3IzvjplYCg7E0ej6ZqiqxbbqKYQMi_oaaE0VNFrlYyPLvM8czm2duIY6GJYtx6-empGhk6Ck6Kov8hESaslLyj-OWENCl4foNl7a6kPu77LWzvtJFWFoIkgZhMz8TyaQAdIXFStakdFFN_LoxXum5PS9cJx9-y-lyWacxWrsqg",
    sort_order: 1,
  },
  {
    title: "Signature Chocolate Cake Slicing & Texture",
    caption: "Pure Belgian chocolate ganache meets moist cocoa sponge in this rich slice cut.",
    reel_url: "https://www.instagram.com/reel/DfPqBAzNhKm/?evlk=MTVlYzNtdHFjMTFqMg==",
    thumbnail_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDINIi_r0Vo9ELxaMCiujjlkwhBY3Z_7tIRhWnnkLzKyQISzBGpcFFqVkgYAn6DNc9w9oNVoFVGHBVm72BOAUUT6bqC8oTEXfiuG62pzTj7SG6eR7InyXhxQnJ10ZDnVd5TDT7l2E9fOk6oq1OM3V5jindiYvKMYcGEcMAZ0Llnkh3iHkDylqJito9YZntzmEScFnvcmSg4-OlUVmVSMq2qd88qpJTpayasXAJFsA",
    sort_order: 2,
  },
];
