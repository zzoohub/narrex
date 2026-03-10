import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/solid-router";
import { HydrationScript } from "solid-js/web";
import { Suspense } from "solid-js";
import { Providers } from "@/app/providers";

import styleCss from "../app/styles.css?url";

export const Route = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: "AI-powered novel writing studio" },
      { property: "og:title", content: "Narrex" },
      { property: "og:description", content: "AI-powered novel writing studio" },
      { property: "og:image", content: "https://narrex.zzooapp.com/og-image.svg" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://narrex.zzooapp.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Narrex" },
      { name: "twitter:description", content: "AI-powered novel writing studio" },
      { name: "twitter:image", content: "https://narrex.zzooapp.com/og-image.svg" },
    ],
    links: [
      { rel: "stylesheet", href: styleCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Noto+Serif+KR:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
      },
    ],
  }),
  shellComponent: RootShell,
});

function RootShell() {
  return (
    <html lang="ko">
      <head>
        <HydrationScript />
        <HeadContent />
      </head>
      <body class="min-h-screen bg-canvas text-fg antialiased">
        <Providers>
          <Suspense>
            <Outlet />
          </Suspense>
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}
