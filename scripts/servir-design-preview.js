// Servidor estático mínimo para conferir o pacote design-preview/ no navegador.
// Não faz parte da aplicação — é ferramenta de trabalho local.
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };

http
  .createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const alvo = path.join(RAIZ, rel === "" ? "design-preview/index.html" : rel);
    if (!alvo.startsWith(RAIZ) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
      res.writeHead(404).end("não encontrado");
      return;
    }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(alvo)] || "application/octet-stream" });
    fs.createReadStream(alvo).pipe(res);
  })
  .listen(3222, () => console.log("design-preview em http://localhost:3222"));
