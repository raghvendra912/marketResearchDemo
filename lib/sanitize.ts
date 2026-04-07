const controlCharsRegex = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(value: string, maxLen = 2000): string {
  return value.replace(controlCharsRegex, "").trim().slice(0, maxLen);
}