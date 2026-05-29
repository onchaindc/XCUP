import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { ThemeInit } from "@/components/ThemeInit";
import WCBackground from "@/components/WCBackground";

export const metadata: Metadata = {
  title: "X Cup Arena",
  description: "A World Cup prediction, SocialFi, NFT, GameFi, and AI agent arena built for X Layer.",
  icons: {
    icon: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="wc-theme">
        <WCBackground />
        <ThemeInit />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                window.addEventListener("unhandledrejection", (event) => {
                  const reason = event.reason;
                  if (!reason || typeof reason !== "object") {
                    return;
                  }

                  const message = "message" in reason ? String(reason.message || "") : "";
                  const code = "code" in reason ? reason.code : undefined;
                  const isErrorLike = reason instanceof Error || "stack" in reason || "name" in reason;
                  const isWalletDisconnect = code === 4900 || /provider is disconnected|disconnected from all chains/i.test(message);

                  if (!isErrorLike || isWalletDisconnect) {
                    const text = message || (typeof code === "number" ? "Wallet provider error " + code : "Wallet provider rejected a request.");
                    console.warn(text);
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
              })();
            `
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
