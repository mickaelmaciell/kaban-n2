import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Meu Kanban Google",
  description: "Gerenciador de tickets via Google Calendar",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning aqui ignora atributos injetados por extensões (como LanguageTool)
    <html lang="pt-br" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}