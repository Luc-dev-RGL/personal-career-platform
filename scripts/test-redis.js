const net = require("net");
const Redis = require("ioredis");

const url = process.env.REDIS_URL || "";
console.log("1) URL    :", url ? url.replace(/\/\/.*@/, "//***@") : "ABSENTE");
console.log("2) Scheme :", url.startsWith("rediss://") ? "rediss:// (TLS) OK" : "PAS DE TLS -> il faut rediss://");
const m = url.match(/@([^:@]+):(\d+)/);
const host = m ? m[1] : null, port = m ? Number(m[2]) : 6379;
console.log("3) Host   :", host, "port", port);
if (!host) { console.log("Host introuvable"); process.exit(1); }

const t0 = Date.now();
const sock = net.connect({ host, port, timeout: 6000 });
sock.on("connect", () => {
  console.log("4) TCP    : port OUVERT (" + (Date.now() - t0) + " ms) -> le reseau passe");
  sock.destroy(); testRedis();
});
sock.on("timeout", () => { console.log("4) TCP    : TIMEOUT -> port 6379 BLOQUE (pare-feu, antivirus ou reseau)"); sock.destroy(); testRedis(); });
sock.on("error", (e) => { console.log("4) TCP    : ECHEC ->", e.message); testRedis(); });

function testRedis() {
  const r = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 8000, retryStrategy: (t) => (t > 2 ? null : 200) });
  r.on("error", (e) => console.log("5) Redis  : erreur ->", e.code || "", e.message));
  r.set("test-redis", "ok", "EX", 60)
    .then(() => r.get("test-redis"))
    .then((v) => { console.log("6) RESULTAT :", v, "-> REDIS FONCTIONNE"); return r.quit(); })
    .catch((e) => { console.log("6) ECHEC   :", e.message); process.exit(1); });
}
