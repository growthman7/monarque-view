export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
export const isPhone = (v) => String(v || '').replace(/[\s.()-]/g, '').match(/^\+?\d{8,15}$/) !== null;

export function validateGuest({ name, email, phone }) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Indiquez votre nom complet.';
  if (!isEmail(email)) errors.email = 'Adresse e-mail invalide, par exemple nom@domaine.com.';
  if (!isPhone(phone)) errors.phone = 'Numéro invalide : 8 à 15 chiffres, indicatif accepté (+225…).';
  return errors;
}

export function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Au moins 8 caractères.';
  if (!/\d/.test(pw) || !/[a-zA-Z]/.test(pw)) return 'Mélangez lettres et chiffres.';
  return null;
}
