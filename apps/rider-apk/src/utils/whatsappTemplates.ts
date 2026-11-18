/**
 * Nigerian WhatsApp Direct Connect & Quick Message Templates for Dispatch Riders
 */

export interface ContactPartyInfo {
  name: string;
  phone: string;
  role: 'sender' | 'recipient';
  trackingCode?: string;
  landmark?: string;
}

export type WhatsAppTemplateKey = 'at_gate' | 'traffic_delay' | 'pin_reminder' | 'call_me';

export interface WhatsAppTemplate {
  key: WhatsAppTemplateKey;
  label: string;
  iconText: string;
  getText: (party: ContactPartyInfo) => string;
}

/**
 * Normalizes any Nigerian telephone format (080..., 234..., +234...) to clean international numbers without plus sign.
 * e.g. 08023456789 -> 2348023456789
 */
export function cleanNigerianPhoneForWhatsApp(phone: string | number): string {
  const str = String(phone || '');
  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.startsWith('234')) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('0')) {
    return `234${digitsOnly.slice(1)}`;
  }
  return `234${digitsOnly}`;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    key: 'at_gate',
    label: 'At Gate / Landmark',
    iconText: '🏢',
    getText: (party) =>
      `Hello ${party.name}, this is your Bayniks Dispatch Rider. I have arrived at your location${
        party.landmark ? ` (${party.landmark})` : ''
      }. Please come down or notify security for package handover.`,
  },
  {
    key: 'traffic_delay',
    label: 'Lagos Traffic Delay',
    iconText: '🚦',
    getText: (party) =>
      `Hello ${party.name}, there is unexpected gridlock along the expressway. My updated ETA is approximately 15 minutes. Live tracking is active on your waybill link.`,
  },
  {
    key: 'pin_reminder',
    label: '4-Digit PIN Ready',
    iconText: '🔢',
    getText: (party) =>
      `Hello ${party.name}, I am approaching your stop. Please have your 4-digit handover PIN ready for secure package verification${
        party.trackingCode ? ` (Order ${party.trackingCode})` : ''
      }.`,
  },
  {
    key: 'call_me',
    label: 'Please Answer Call',
    iconText: '📞',
    getText: (party) =>
      `Hello ${party.name}, I have been trying to reach your line. Please check your phone or send instructions so I can deliver your package without delay.`,
  },
];

/**
 * Builds standard WhatsApp deep-link URL.
 * Accepts either (phone, message) or (partyInfo, templateKey).
 */
export function buildWhatsAppUrl(
  phoneOrParty: string | ContactPartyInfo,
  messageOrKey: string | WhatsAppTemplateKey
): string {
  let phone = '';
  let message = '';

  if (typeof phoneOrParty === 'object' && phoneOrParty !== null) {
    phone = phoneOrParty.phone;
    const template = WHATSAPP_TEMPLATES.find((t) => t.key === messageOrKey);
    message = template ? template.getText(phoneOrParty) : String(messageOrKey);
  } else {
    phone = String(phoneOrParty);
    message = String(messageOrKey);
  }

  const cleaned = cleanNigerianPhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encodedText}`;
}

/**
 * Launches WhatsApp chat with pre-filled template.
 */
export function launchWhatsAppChat(party: ContactPartyInfo, templateKey: WhatsAppTemplateKey): void {
  if (typeof window === 'undefined') return;

  const template = WHATSAPP_TEMPLATES.find((t) => t.key === templateKey) || WHATSAPP_TEMPLATES[0]!;
  const message = template.getText(party);
  const url = buildWhatsAppUrl(party.phone, message);

  window.open(url, '_blank');
}
