/**
 * 토스 로그인 `/login-me` 개인정보 필드 복호화.
 * @see https://developers-apps-in-toss.toss.im/login/develop.md 섹션 5
 * - AES-256-GCM
 * - IV(NONCE) 길이 12바이트, Base64 디코드 후 앞 12바이트
 * - 나머지 = ciphertext + auth tag(16바이트, Web Crypto 표준)
 * - AAD: 이메일로 전달된 문자열을 UTF-8 바이트로
 * - 키: 이메일의 Base64 인코딩된 256비트(32바이트) AES 키
 */

const IV_LENGTH = 12;

function decodeBase64ToBytes(input: string): Uint8Array {
  const normalized = input.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/**
 * 토스가 내려준 Base64 암호문 한 필드를 평문 UTF-8 문자열로 복호화.
 */
export async function decryptTossLoginAesGcm(
  encryptedBase64: string,
  base64EncodedAes256Key: string,
  aadUtf8: string,
): Promise<string> {
  const decoded = decodeBase64ToBytes(encryptedBase64);
  if (decoded.length < IV_LENGTH + 16) {
    throw new Error('toss decrypt: payload too short');
  }

  const iv = decoded.subarray(0, IV_LENGTH);
  const ciphertextWithTag = decoded.subarray(IV_LENGTH);

  const rawKey = decodeBase64ToBytes(base64EncodedAes256Key);
  if (rawKey.length !== 32) {
    throw new Error(`toss decrypt: AES key must decode to 32 bytes, got ${rawKey.length}`);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const plain = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(aadUtf8),
      tagLength: 128,
    },
    cryptoKey,
    ciphertextWithTag,
  );

  return new TextDecoder('utf-8', { fatal: false }).decode(plain);
}

/** 키/AAD 없거나 값 없으면 null. 복호화 실패 시 null (로그인 전체는 진행 가능). */
export async function tryDecryptTossLoginField(
  value: string | null | undefined,
  base64EncodedAes256Key: string,
  aadUtf8: string,
): Promise<string | null> {
  if (value == null || value === '') return null;
  if (!base64EncodedAes256Key || !aadUtf8) return null;
  try {
    return await decryptTossLoginAesGcm(value, base64EncodedAes256Key, aadUtf8);
  } catch {
    return null;
  }
}
