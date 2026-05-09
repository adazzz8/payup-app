function normalizeIsraeliPhone(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+972")) {
    return `972${digitsOnly.slice(4)}`;
  }

  if (digitsOnly.startsWith("972")) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith("0")) {
    return `972${digitsOnly.slice(1)}`;
  }

  return digitsOnly.replace(/^\+/, "");
}

export function buildWhatsappUrl(phone: string | null | undefined, message: string): string | null {
  if (!phone || phone.trim().length === 0) {
    return null;
  }

  const normalizedPhone = normalizeIsraeliPhone(phone.trim());
  if (!normalizedPhone) {
    return null;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}
