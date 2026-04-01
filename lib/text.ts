const NEWSLETTER_PATTERNS: RegExp[] = [
  /view this email in your browser/gi,
  /unsubscribe\b.*$/gim,
  /manage preferences\b.*$/gim,
  /you are receiving this email/gi,
  /follow us on\s+(x|twitter|linkedin|facebook|instagram)/gi,
  /copyright\s+\d{4}.*$/gim,
];

function removeCommonBoilerplate(text: string): string {
  return NEWSLETTER_PATTERNS.reduce((current, pattern) => current.replace(pattern, " "), text);
}

function removeRepeatedEdgeLines(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 6) {
    return lines.join("\n");
  }

  const lineCounts = new Map<string, number>();
  for (const line of lines) {
    lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
  }

  const isRepeated = (line: string) => (lineCounts.get(line) ?? 0) > 1 && line.length <= 120;

  while (lines.length > 0 && isRepeated(lines[0])) {
    lines.shift();
  }

  while (lines.length > 0 && isRepeated(lines[lines.length - 1])) {
    lines.pop();
  }

  return lines.join("\n");
}

export function cleanText(text: string, maxLength = 12000): string {
  let cleaned = text || "";

  cleaned = cleaned.replace(/\r\n?/g, "\n");
  cleaned = removeCommonBoilerplate(cleaned);
  cleaned = removeRepeatedEdgeLines(cleaned);

  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = `${cleaned.slice(0, maxLength)}...`;
  }

  return cleaned;
}
