"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const META_PIXEL_ID = "1841018156120390";

// O pixel existe para medir o funil público. As telas internas (/gestao) ficam de fora:
// PageView de gente da equipe sujaria o sinal que o Meta usa para otimizar campanha.
export default function MetaPixel() {
  const pathname = usePathname();
  if (pathname?.startsWith("/gestao")) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          if (!window.__metaPixelInitialized) {
            window.__metaPixelInitialized = true;
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            var pvEventId = (window.crypto && crypto.randomUUID)
              ? crypto.randomUUID()
              : ('pv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9));

            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView', {}, { eventID: pvEventId });
          }
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
