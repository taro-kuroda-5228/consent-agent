import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MedEvidence Consent Agent",
  description:
    "AI-assisted informed consent for acute aortic dissection — Phase 1 click demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJp.className} min-h-screen antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
