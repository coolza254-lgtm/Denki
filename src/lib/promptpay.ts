// PromptPay QR payload (EMVCo merchant-presented QR, Thai PromptPay spec).

const PROMPTPAY_AID = 'A000000677010111';

function tlv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, '0') + value;
}

/** CRC-16/CCITT-FALSE, as required by EMVCo tag 63. */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Phone number (10 digits), national/tax ID (13) or e-wallet ID (15). */
export function isValidPromptPayId(id: string): boolean {
  const d = id.replace(/\D/g, '');
  return d.length === 10 || d.length === 13 || d.length === 15;
}

function targetField(id: string): string {
  const d = id.replace(/\D/g, '');
  if (d.length >= 15) return tlv('03', d);
  if (d.length >= 13) return tlv('02', d);
  // Phone: drop the leading 0, prefix with country code 66, pad to 13.
  const phone = ('66' + d.replace(/^0/, '')).padStart(13, '0');
  return tlv('01', phone);
}

export function promptPayPayload(id: string, amount?: number): string {
  const parts = [
    tlv('00', '01'),
    tlv('01', amount ? '12' : '11'),
    tlv('29', tlv('00', PROMPTPAY_AID) + targetField(id)),
    tlv('58', 'TH'),
    tlv('53', '764'),
  ];
  if (amount) parts.push(tlv('54', amount.toFixed(2)));
  const body = parts.join('') + '6304';
  return body + crc16(body);
}
