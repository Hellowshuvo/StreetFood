import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider/ThemeProvider";

export const metadata: Metadata = {
  title: "Street Food — Discover Local Flavors",
  description:
    "Find the best street food stalls near you. Rate, review, and share your favorite food spots across Bangladesh.",
  keywords: [
    "street food",
    "food discovery",
    "Bangladesh food",
    "food map",
    "Narayanganj",
    "food rating",
  ],
  openGraph: {
    title: "Street Food — Discover Local Flavors",
    description: "Find the best street food stalls near you.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
