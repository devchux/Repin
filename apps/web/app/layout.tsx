import type { Metadata } from "next";
import localFont from "next/font/local";
import { RepinQueryProvider } from "@repo/client/query";
import { Toaster } from "@repo/ui/sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Repin AI",
  description: "Your intelligent companion for the web.",
  icons: {
    icon: "/images/repin-logo-icon.png",
    shortcut: "/images/repin-logo-icon.png",
    apple: "/images/repin-logo-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <RepinQueryProvider>{children}</RepinQueryProvider>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
