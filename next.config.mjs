/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // A área interna e as rotas de API não devem ser indexadas, arquivadas nem
        // usadas como trecho em buscador ou IA. O cabeçalho vale mesmo quando a
        // resposta não é HTML — a meta tag da página sozinha não cobriria a API.
        source: "/:path(gestao|api)/:rest*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
