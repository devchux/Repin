import type { Metadata } from "next";
import localFont from "next/font/local";
import { RepinQueryProvider } from "@repo/client/query";
import { Toaster } from "@repo/ui/sonner";
import { ThemeProvider } from "@/components/common/theme-provider";
import "./globals.css";

const themeScript = `
try {
  const theme = localStorage.getItem("repin:theme") || "system";
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = theme === "system" ? "light dark" : theme;
} catch {}
`;

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ThemeProvider>
          <RepinQueryProvider>{children}</RepinQueryProvider>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
