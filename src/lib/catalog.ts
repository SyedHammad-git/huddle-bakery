import type { Category, ProductInput } from "@/lib/types";

type Seed = Omit<ProductInput, "sort_order">;

const rows: Seed[] = [
  { name: "Vanilla Sundae", category: "Sundaes", price: 240, regular_price: null, badge: null, flavors: ["Vanilla"], description: "A cool, creamy vanilla sundae made fresh with smooth custard.", image_url: "./images/vanilla-sundae.jpg" },
  { name: "Chocolate Sundae", category: "Sundaes", price: 240, regular_price: null, badge: null, flavors: ["Chocolate"], description: "Velvety chocolate sundae finished with a rich chocolate drizzle.", image_url: "./images/chocolate-sundae.jpg" },
  { name: "Brownie (Per Piece)", category: "Brownies & Snownies", price: 240, regular_price: null, badge: null, flavors: ["Chocolate"], description: "A fudgy, generously sized brownie with a delicate crinkle top.", image_url: "./images/brownie-piece.jpg" },
  { name: "Brownie Tray (9 Pieces)", category: "Brownies & Snownies", price: 2000, regular_price: null, badge: null, flavors: ["Chocolate"], description: "Nine rich brownies in a fresh-baked tray, perfect for sharing.", image_url: "./images/brownie-tray-9.jpg" },
  { name: "Brownie Bites with Drip", category: "Brownies & Snownies", price: 220, regular_price: null, badge: null, flavors: ["Chocolate"], description: "Bite-size brownie goodness finished with a silky chocolate drip.", image_url: "./images/brownie-bites-drip.jpg" },
  { name: "Snownies", category: "Brownies & Snownies", price: 250, regular_price: null, badge: null, flavors: ["Chocolate"], description: "Our signature soft-centered snownies with a delicate snowy finish.", image_url: "./images/snownies.jpg" },
  { name: "Vanilla Cake (Per Pound)", category: "Cakes & Cupcakes", price: 800, regular_price: null, badge: null, flavors: ["Vanilla"], description: "Light vanilla sponge baked fresh for your celebrations.", image_url: "./images/vanilla-cake.jpg" },
  { name: "Vanilla Sponge & Chocolate Cream Cake", category: "Cakes & Cupcakes", price: 2000, regular_price: null, badge: null, flavors: ["Vanilla", "Chocolate"], description: "Soft vanilla sponge layered with luscious chocolate cream.", image_url: "./images/vanilla-sponge-choc-cake.jpg" },
  { name: "Almond Cake (Per Pound)", category: "Cakes & Cupcakes", price: 800, regular_price: null, badge: null, flavors: ["Almond"], description: "A tender, fragrant almond cake baked to order.", image_url: "./images/almond-cake.jpg" },
  { name: "Coconut Cake (Per Pound)", category: "Cakes & Cupcakes", price: 800, regular_price: null, badge: null, flavors: ["Coconut"], description: "A soft coconut cake with a delicate, toasted finish.", image_url: "./images/coconut-cake.jpg" },
  { name: "Matilda Cake", category: "Cakes & Cupcakes", price: 2100, regular_price: null, badge: null, flavors: ["Chocolate"], description: "A dramatic, deeply chocolatey cake layered with smooth ganache.", image_url: "./images/matilda-cake.jpg" },
  { name: "Vanilla Cupcake", category: "Cakes & Cupcakes", price: 60, regular_price: null, badge: null, flavors: ["Vanilla"], description: "A little vanilla sponge cupcake, freshly baked and tender.", image_url: "./images/vanilla-cupcake.jpg" },
  { name: "Chocolate Cupcake", category: "Cakes & Cupcakes", price: 80, regular_price: null, badge: null, flavors: ["Chocolate"], description: "A soft chocolate cupcake made with rich cocoa.", image_url: "./images/chocolate-cupcake.jpg" },
  { name: "The Sweet Trio Deal", category: "Exclusive Deals", price: 599, regular_price: "700", badge: "SAVE RS 101", flavors: ["Chocolate"], description: "1 Chocolate Sundae, 1 Brownie, and 1 Brownie Bite with Drip.", included_items: ["1 Chocolate Sundae", "1 Brownie", "1 Brownie Bite with Drip"], image_url: "./images/deal-1-solo.jpg" },
  { name: "The Bestie Deal", category: "Exclusive Deals", price: 799, regular_price: "960", badge: "BESTIE FAVORITE", flavors: ["Vanilla", "Chocolate"], description: "Because desserts taste better with your bestie. 2 Sundaes (Vanilla or Chocolate) and 2 Brownies.", included_items: ["2 Sundaes (Vanilla or Chocolate)", "2 Brownies"], image_url: "./images/deal-2-bestie.jpg" },
  { name: "The Cake Date", category: "Exclusive Deals", price: 1599, regular_price: "1,840–1,920", badge: "DATE NIGHT", flavors: ["Vanilla", "Almond", "Coconut"], description: "2 pounds of cake (Vanilla, Almond, or Coconut) plus 4 Cupcakes (mix Vanilla & Chocolate).", included_items: ["2 pounds of cake (Vanilla, Almond, or Coconut)", "4 Cupcakes (mix Vanilla & Chocolate)"], image_url: "./images/deal-3-cake-date.jpg" },
  { name: "9 Brownies Box Deal", category: "Exclusive Deals", price: 2000, regular_price: "2,160", badge: "BOX OF 9", flavors: ["Chocolate"], description: "9 Brownies in one box.", included_items: ["9 Brownies"], image_url: "./images/deal-4-brownie-box.jpg" },
  { name: "The Duo Craving", category: "Exclusive Deals", price: 799, regular_price: "920", badge: "DUO DEAL", flavors: ["Vanilla", "Chocolate"], description: "1 Vanilla Sundae, 1 Chocolate Sundae, and 2 Brownie Bites with Drip.", included_items: ["1 Vanilla Sundae", "1 Chocolate Sundae", "2 Brownie Bites with Drip"], image_url: "./images/deal-5-duo-craving.jpg" },
  { name: "Matilda Indulgence Deal", category: "Exclusive Deals", price: 2250, regular_price: "2,420", badge: "CHOCOLATE FIX", flavors: ["Chocolate"], description: "1 Matilda Cake plus 4 Chocolate Cupcakes.", included_items: ["1 Matilda Cake", "4 Chocolate Cupcakes"], image_url: "./images/deal-6-matilda.jpg" },
  { name: "The Little Treat Deal", category: "Exclusive Deals", price: 499, regular_price: "600", badge: "LITTLE LUXURY", flavors: ["Vanilla", "Chocolate"], description: "2 Vanilla Cupcakes, 2 Chocolate Cupcakes, and 2 Brownie Bites with Drip.", included_items: ["2 Vanilla Cupcakes", "2 Chocolate Cupcakes", "2 Brownie Bites with Drip"], image_url: "./images/deal-7-little-treat.jpg" },
  { name: "Snowy Love", category: "Exclusive Deals", price: 899, regular_price: "1,000", badge: "SNOWY SPECIAL", flavors: ["Chocolate"], description: "4 Snownies.", included_items: ["4 Snownies"], image_url: "./images/deal-8-snowy-love.jpg" },
  { name: "The Huddle Family Box", category: "Exclusive Deals", price: 1399, regular_price: "1,600", badge: "FAMILY FAVORITE", flavors: ["Vanilla", "Chocolate"], description: "For when nobody wants to share… but everyone wants dessert. 1 Vanilla Cake (1 pound), 4 Brownies, and 4 Cupcakes (2 Vanilla + 2 Chocolate).", included_items: ["1 Vanilla Cake (1 pound)", "4 Brownies", "4 Cupcakes (2 Vanilla + 2 Chocolate)"], image_url: "./images/deal-9-family-box.jpg" },
];

export const seedProducts: ProductInput[] = rows.map((row, sort_order) => ({
  ...row,
  category: row.category as Category,
  sort_order,
}));
