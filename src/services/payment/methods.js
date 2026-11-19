/**
 * Moyens de paiement SycaPay souhaités par MONARQUE.
 * Aucun n'est présenté comme disponible tant que le backend ne l'a pas confirmé
 * (GET /payments/methods → verified[]), d'après la documentation officielle SycaPay.
 */
export const WANTED_METHODS = [
  { id: 'orange_money', label: 'Orange Money', group: 'mobile' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', group: 'mobile' },
  { id: 'moov_money', label: 'Moov Money', group: 'mobile' },
  { id: 'wave', label: 'Wave', group: 'mobile' },
  { id: 'visa', label: 'Carte Visa', group: 'card' },
  { id: 'mastercard', label: 'Carte Mastercard', group: 'card' },
];
