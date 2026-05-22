const http = require("http");
const crypto = require("crypto");
const { execSync } = require("child_process");

const SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.WEBHOOK_PORT || 9000;
const PROJECT_DIR = process.env.PROJECT_DIR || "/root/student-platform";

function verify(secret, payload, signature) {
  const hmac = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404).end();
    return;
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const payload = Buffer.concat(chunks);
    const sig = req.headers["x-hub-signature-256"];

    if (!sig || !verify(SECRET, payload, sig)) {
      console.log("Invalid signature");
      res.writeHead(401).end();
      return;
    }

    const event = req.headers["x-github-event"];
    if (event !== "push") {
      res.writeHead(200).end("ignored");
      return;
    }

    const body = JSON.parse(payload.toString());
    if (body.ref !== "refs/heads/main") {
      res.writeHead(200).end("ignored");
      return;
    }

    res.writeHead(200).end("deploying");
    console.log(`[${new Date().toISOString()}] Push to main — deploying...`);

    try {
      execSync(`cd ${PROJECT_DIR} && git pull && docker compose up -d --build`, {
        stdio: "inherit",
      });
      console.log("Deploy complete");
    } catch (err) {
      console.error("Deploy failed:", err.message);
    }
  });
});

server.listen(PORT, () => console.log(`Webhook listener on port ${PORT}`));
