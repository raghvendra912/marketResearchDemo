const slugChars = "abcdefghijklmnopqrstuvwxyz0123456789";

export function extractSurveyId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const sIndex = parts.findIndex((part) => part === "s");
    if (sIndex >= 0 && parts[sIndex + 1] && uuidRegex.test(parts[sIndex + 1])) {
      return parts[sIndex + 1];
    }
  } catch {
    return null;
  }

  return null;
}

export function createSlug(length = 8): string {
  let slug = "";
  for (let i = 0; i < length; i += 1) {
    const randomIndex = Math.floor(Math.random() * slugChars.length);
    slug += slugChars[randomIndex];
  }
  return slug;
}
