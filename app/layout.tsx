import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Readiness OS",
  description: "GPS de conclusão para projetos SaaS construídos com agentes de IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
