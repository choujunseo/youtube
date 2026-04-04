/**
 * Reads `supabase/.edge-secrets.source.env` and writes `supabase/.edge-secrets.local.env`
 * for `supabase secrets set --env-file` (Edge Functions only).
 * Do not commit the source/output files. 예시: `.edge-secrets.source.env.example`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcEnv = path.join(root, 'supabase', '.edge-secrets.source.env');
const outFile = path.join(root, 'supabase', '.edge-secrets.local.env');

const EDGE_KEYS = [
  'TOSS_WEBHOOK_SECRET',
  'TOSS_CLIENT_ID',
  'TOSS_CLI_SECRET',
  'TOSS_MTLS_CERT_PEM',
  'TOSS_MTLS_KEY_PEM',
  'TOSS_USER_INFO_AES_KEY_BASE64',
  'TOSS_USER_INFO_AAD',
  'TOSS_PROMOTION_CODE_FIRST_VOTE_5',
  'TOSS_PROMOTION_CODE_MILESTONE_600_CREATOR',
  'TOSS_PROMOTION_CODE_MILESTONE_600_RANK_1',
  'TOSS_PROMOTION_CODE_MILESTONE_600_RANK_150',
  'TOSS_PROMOTION_CODE_MILESTONE_600_RANK_300',
  'TOSS_PROMOTION_CODE_MILESTONE_600_RANK_450',
  'TOSS_PROMOTION_CODE_MILESTONE_600_RANK_600',
  'TOSS_PROMOTION_CODE_MILESTONE_600_GENERAL_1',
  'TOSS_PROMOTION_GET_KEY_URL',
  'TOSS_PROMOTION_EXECUTE_URL',
  'TOSS_PROMOTION_RESULT_URL',
  'TOSS_SMART_MESSAGE_SEND_URL',
  'TOSS_TEMPLATE_CODE_IDEA_GRADUATED_CREATOR',
  'TOSS_TEMPLATE_CODE_IDEA_GRADUATED_VOTER',
  'PAYOUT_DRY_RUN',
  'PAYOUT_WORKER_SECRET',
];

function parseDotEnv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function escapePemForEnv(pem) {
  return pem.trim().replace(/\r\n/g, '\n').replace(/\n/g, '\\n');
}

function quoteEnvValue(val) {
  if (val === '') return '""';
  if (/[\s#"']|^$/u.test(val)) return JSON.stringify(val);
  return val;
}

function readOptionalPem(baseName) {
  const crt = path.join(root, 'certs', `${baseName}_public.crt`);
  const keyPath = path.join(root, 'certs', `${baseName}_private.key`);
  if (fs.existsSync(crt) && fs.existsSync(keyPath)) {
    return {
      cert: escapePemForEnv(fs.readFileSync(crt, 'utf8')),
      key: escapePemForEnv(fs.readFileSync(keyPath, 'utf8')),
    };
  }
  return null;
}

if (!fs.existsSync(srcEnv)) {
  console.error(
    `Missing ${srcEnv}\nCopy supabase/.edge-secrets.source.env.example → supabase/.edge-secrets.source.env and fill values.`,
  );
  process.exit(1);
}

const parsed = parseDotEnv(fs.readFileSync(srcEnv, 'utf8'));
if (!parsed.TOSS_CLI_SECRET && parsed.TOSS_CLIENT_SECRET) {
  parsed.TOSS_CLI_SECRET = parsed.TOSS_CLIENT_SECRET;
}
const lines = [];
const used = new Set();

for (const k of EDGE_KEYS) {
  if (parsed[k] != null && parsed[k] !== '') {
    lines.push(`${k}=${quoteEnvValue(parsed[k])}`);
    used.add(k);
  }
}

const defaultPemBase = 'youtube-vote-miniapp-mtls-client-prod';
const pem = readOptionalPem(defaultPemBase);
if (pem) {
  if (!used.has('TOSS_MTLS_CERT_PEM')) {
    lines.push(`${'TOSS_MTLS_CERT_PEM'}=${quoteEnvValue(pem.cert)}`);
  }
  if (!used.has('TOSS_MTLS_KEY_PEM')) {
    lines.push(`${'TOSS_MTLS_KEY_PEM'}=${quoteEnvValue(pem.key)}`);
  }
}

if (lines.length === 0) {
  console.error('No edge secrets to write (check supabase/.edge-secrets.source.env and certs/).');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${lines.join('\n')}\n`, 'utf8');
console.log(outFile);
