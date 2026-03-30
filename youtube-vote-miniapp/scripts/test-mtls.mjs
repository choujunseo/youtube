import fs from "node:fs";
import https from "node:https";

const certPath =
  process.env.TOSS_MTLS_CERT_PATH ||
  "./certs/youtube-vote-miniapp-mtls-client-prod_public.crt";
const keyPath =
  process.env.TOSS_MTLS_KEY_PATH ||
  "./certs/youtube-vote-miniapp-mtls-client-prod_private.key";
const targetUrl = process.env.TOSS_MTLS_TEST_URL;

if (!targetUrl) {
  console.error("Missing TOSS_MTLS_TEST_URL environment variable.");
  process.exit(1);
}

if (!fs.existsSync(certPath)) {
  console.error(`Certificate file not found: ${certPath}`);
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Private key file not found: ${keyPath}`);
  process.exit(1);
}

const cert = fs.readFileSync(certPath);
const key = fs.readFileSync(keyPath);

const url = new URL(targetUrl);

const request = https.request(
  {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || 443,
    path: `${url.pathname}${url.search}`,
    method: "GET",
    cert,
    key,
    rejectUnauthorized: true,
    timeout: 10000,
    headers: {
      Accept: "application/json, text/plain, */*",
    },
  },
  (response) => {
    let body = "";
    response.setEncoding("utf8");

    response.on("data", (chunk) => {
      body += chunk;
    });

    response.on("end", () => {
      console.log(`Status: ${response.statusCode}`);
      console.log(`Response: ${body || "(empty)"}`);
      process.exit(response.statusCode && response.statusCode < 400 ? 0 : 1);
    });
  }
);

request.on("timeout", () => {
  request.destroy(new Error("Request timed out."));
});

request.on("error", (error) => {
  console.error(`mTLS request failed: ${error.message}`);
  process.exit(1);
});

request.end();
