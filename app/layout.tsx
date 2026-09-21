import type { Metadata } from "next";
import "./globals.css";
import "./application.css";

export const metadata: Metadata = {
  title: "Encuesta Rural | Participación Ciudadana",
  description:
    "Participa en el sondeo de opinión de tu comunidad. Consulta información y resultados agregados.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
