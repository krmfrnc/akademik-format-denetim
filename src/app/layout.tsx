import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akademik Format Denetim Platformu",
  description:
    "Akademik belgelerinizi APA, Vancouver ve kurumsal formatlara göre otomatik denetleyin, kaynakçalarınızı doğrulayın.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
