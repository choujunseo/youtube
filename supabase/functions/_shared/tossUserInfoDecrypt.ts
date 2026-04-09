/**
 * 토스 login-me 개인정보 필드 복호화 (develop.md §5).
 * AES-256-GCM, IV(12) + 암호문+태그(Base64 문자열을 디코드한 바이트열).
 */
const IV_LEN = 12;
const TAG_BITS = 128;

function decodeBase64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/\s/g, '');
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** @returns 복호화된 UTF-8 문자열, 실패 시 null */
export async function decryptTossUserInfoField(
  encryptedBase64: string,
  aesKeyBase64: string,
  aad: string,
): Promise<string | null> {
  const trimmed = encryptedBase64.trim();
  if (!trimmed) return null;

  try {
    const decoded = decodeBase64ToBytes(trimmed);
    if (decoded.length < IV_LEN + 16 + 1) return null;

    const iv = decoded.slice(0, IV_LEN);
    const ciphertextWithTag = decoded.slice(IV_LEN);

    const keyRaw = decodeBase64ToBytes(aesKeyBase64);
    if (keyRaw.byteLength !== 32) {
      console.error('TOSS_USER_INFO_AES_KEY_BASE64 must decode to 32 bytes (AES-256)');
      return null;
    }

    const key = await crypto.subtle.importKey('raw', keyRaw, { name: 'AES-GCM' }, false, ['decrypt']);

    const aadBytes = new TextEncoder().encode(aad);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aadBytes, tagLength: TAG_BITS },
      key,
      ciphertextWithTag,
    );

    return new TextDecoder('utf-8', { fatal: false }).decode(plain);
  } catch (e) {
    console.warn('decryptTossUserInfoField failed', e);
    return null;
  }
}

export function sanitizeDisplayName(raw: string, maxLen = 200): string {
  const s = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
