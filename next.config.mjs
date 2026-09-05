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
          // O LiteSpeed da Hostinger guarda resposta de GET dinâmico pela URL exata e
          // serve a versão velha por tempo indeterminado — foi o que fez o relatório
          // aparecer vazio depois do primeiro sync. Sem isto, a página só atualiza
          // quando alguém acrescenta uma query string na mão.
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

export default nextConfig;
