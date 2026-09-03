import type { Metadata } from "next";
import "./globals.css"; // Sesuaikan jika ada file css lain

export const metadata: Metadata = {
  title: "Mbak Nining - Asisten AI Setiamu",
  description: "Asisten suara AI interaktif untuk bantu putar lagu, buka aplikasi, dan ngobrol santai.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Mbak Nining - Asisten AI Setiamu",
    description: "Asisten suara AI interaktif untuk bantu putar lagu, buka aplikasi, dan ngobrol santai.",
    url: "https://mbak-nining-ai.vercel.app",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Mbak Nining AI Preview",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}