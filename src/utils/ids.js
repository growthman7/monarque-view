export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/1/I : lisible au téléphone

/** Référence de réservation lisible : MQ-7K3X9P */
export const reservationRef = () => {
  let s = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return `MQ-${s}`;
};

/** PRNG déterministe pour les données de démonstration. */
export const seeded = (seed = 42) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const rowLetter = (i) => {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};
