import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { LocationProvider } from "@/components/location-provider";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AussieEats — Food delivery across Australia",
  description:
    "Local-only multi-vendor food delivery demo. Browse restaurants in Sydney, Melbourne, Brisbane, Perth, Adelaide, and Hobart; order COD; manage menus in admin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <LocationProvider>
          <CartProvider>{children}</CartProvider>
        </LocationProvider>
      </body>
    </html>
  );
}
