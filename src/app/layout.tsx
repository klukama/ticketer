import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ticketer - Veranstaltungssitzplätze",
  description: "Veranstaltungsticket- und Sitzplatzauswahlsystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
