export const CONTACT_FOOTER =
  "\n\n📧 marcoszinga94@gmail.com · 📱 https://wa.me/5493584406950";

export function appendContact(text: string): string {
  if (text.includes("wa.me/5493584406950")) return text;
  return `${text}${CONTACT_FOOTER}`;
}

export function toPlainText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/^>\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\r\n|\r|\n){3,}/g, "\n\n")
    .trim();
}