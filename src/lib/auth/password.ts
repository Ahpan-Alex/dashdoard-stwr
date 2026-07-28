/** Hachage mot de passe (PBKDF2-SHA256) — cible SaaS : Argon2id côté serveur. */

const ITERATIONS = 210_000;
const enc = new TextEncoder();

function bufToB64(buf: ArrayBuffer | Uint8Array) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBuf(b64: string) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export async function hashPassword(
  password: string,
  saltB64?: string,
): Promise<{ hash: string; salt: string }> {
  const salt =
    saltB64 != null
      ? b64ToBuf(saltB64)
      : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return { hash: bufToB64(bits), salt: bufToB64(salt) };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
) {
  const next = await hashPassword(password, salt);
  return timingSafeEqual(next.hash, hash);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/** Politique MDP (NIST-inspired) */
export function validerMotDePasse(password: string): string[] {
  const errs: string[] = [];
  if (password.length < 12) {
    errs.push("Au moins 12 caractères");
  }
  if (password.length > 128) {
    errs.push("Maximum 128 caractères");
  }
  const lower = password.toLowerCase();
  if (
    ["password", "motdepasse", "123456", "stwr", "admin"].some((w) =>
      lower.includes(w),
    )
  ) {
    errs.push("Mot de passe trop courant / prévisible");
  }
  return errs;
}
