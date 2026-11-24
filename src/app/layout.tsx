import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HUDDLE BAKERY | Baked Fresh. Shared Together.",
  description: "Handcrafted cakes, brownies, and dessert cups baked fresh daily by HUDDLE BAKERY. Order luxury treats for delivery in Faisalabad, Multan, and Kot Addu.",
  openGraph: {
    title: "HUDDLE BAKERY | Baked Fresh. Shared Together.",
    description: "Handcrafted cakes, brownies, and dessert cups baked fresh daily and delivered across Punjab.",
    images: ["https://lh3.googleusercontent.com/aida-public/AB6AXuAAoKy5HKKWaLl-UZGXQTYW0ehcxmkKA1eeLZ9KusE5T8MEq_FWkfO5zdfd_Og75P_A7dKcbAIm9M-zvBAJsPh2PvzsOSCMmQ95ZYgaYXXTG5DUnbDwdCPOYLa9ztU9x_jgGtFPBImpYy7iybnvmizqLeJMk9qHyBSQyUJG3mXz-NwGIpGNQdpLdx6XhSutFQjNWzim1VdQkBq-lI4tzwoa9_CwRhIYjoPGwFgGQ64"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
