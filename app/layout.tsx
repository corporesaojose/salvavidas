import type { Metadata } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const META_PIXEL_ID = "1841018156120390";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Missão Salva-Vidas | Corpore",
  description: "Sua missão começa aqui. Descubra seu perfil de saúde e comece sua experiência de 15 dias na Corpore.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${archivoBlack.variable}`}>
      <head>
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
          <img
            height="1" width="1" style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      </head>
      <body className="font-sans bg-ink-900 text-[#faf8f0] antialiased">
        {children}
      </body>
    </html>
  );
}
