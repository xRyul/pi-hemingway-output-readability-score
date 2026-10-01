import { stripVTControlCharacters } from "node:util";

// Count-only equivalent of the previous pinned Hemingway engine's sentence rules.
// Abbreviations matter: splitting on every period changes the document grade.
const boundary = /[.?!]{1,2}["”'\)]?(?:\s|$)|\n+/;
const titles = /\b(Mr|Ms|Mrs|Dr|Col|Sgt|Lt|Adm|Maj|Sen|Rep|Pvt|Cpl|Capt|Gen|Gov|Rev|M|Mme|Prof|Pres|Hon)$/;
const abbreviations = /\b(U\.S|Jan|Feb|Apr|Mar|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|Ave|St|inc|Inc|Corp|Co|Dept|Univ|Ft|Mt|ft|mg|oz|Jr|Sr|ltd|Ltd|etc|vs|e\.g|i\.e|a\.m|p\.m|Rd|Blvd|et al|Ph\.D)$/;
const references = /\b(p|pp|Fig|Figs|Eq|Ch|Sec|No|Nos|Vol|Vols|Apt|Ste)$/;
const capitalContinuations = new Set(["D.C", "Dept", "E.U", "Ft", "Mt", "Ph.D", "St", "U.K", "U.S", "Univ", "vs"]);
const initialAbbreviations = new Set(["D.C", "E.U", "U.K"]);
const sentenceStarters = new Set("A An And But He Her Here His How However I It Its My Next Our She That The Their Then There These They This Those We What When Where Which Who Whose Why You Your".split(" "));
const opening = String.raw`\s*(?:(?:\(|\[|\{|["'“‘])\s*)*`;
const capitalWord = new RegExp(`^${opening}([\\p{Lu}][\\p{L}\\p{M}'’\\-]*)(?=$|[\\s,;:()\\[\\]"'”’])`, "u");
const initial = new RegExp(`^${opening}[A-Z]$`);
const lowercaseOrNumber = new RegExp(`^${opening}[–—-]?\\s*(?:[\\p{Ll}]|\\d)`, "u");
const number = String.raw`(?:\d+(?:\.\d+)*(?:[A-Za-z]+)?|[A-Za-z]+\d+[A-Za-z0-9]*)`;
const reference = `(?:${number}|[IVXLCDMivxlcdm]{2,}|[A-Za-z])`;
const referenceRange = `${reference}(?:[–—-]${reference})?`;
const numberRange = `${number}(?:[–—-]${number})?`;
const referenceValue = new RegExp(`^\\s*((?:\\(${referenceRange}\\)|${referenceRange}))(?=$|[\\s,.;:()\\[\\]])`);
const numberedValue = new RegExp(`^\\s*((?:\\(${referenceRange}\\)|${numberRange}))(?=$|[\\s,.;:()\\[\\]])`);

function continuation(text: string, next: string, lineStart: boolean): "continue" | "stop" | undefined {
  if (lineStart && /^\s*(?:\d+|[A-Za-z])$/.test(text)) return "continue";
  const nextWord = next.match(capitalWord)?.[1];
  const name = !!nextWord && !sentenceStarters.has(nextWord);
  if (titles.test(text)) return initial.test(next) || name ? "continue" : undefined;
  const abbreviation = text.match(abbreviations)?.[1];
  const initials = text.match(/(?:^|\s)((?:[A-Z]\.)+[A-Z])$/)?.[1];
  const shortened = abbreviation ?? (initials && initialAbbreviations.has(initials) ? initials : undefined);
  if (shortened) {
    return lowercaseOrNumber.test(next) || (shortened === "et al" && /^\s*\(\d{4}[a-z]?\)/.test(next))
      || (capitalContinuations.has(shortened) ? name : shortened === "Co" && nextWord === "Ltd")
      ? "continue" : undefined;
  }
  const ref = text.match(references)?.[1];
  if (ref) {
    const value = next.match(ref === "No" || ref === "Nos" ? numberedValue : referenceValue)?.[1];
    return value ? next.trim() === value ? "stop" : "continue" : undefined;
  }
  if (/(?:^|\s)[A-Z]$/.test(text)) return name ? "continue" : undefined;
  return /\b(\.\.)$/.test(text) ? "continue" : undefined;
}

function plainText(source: string): string {
  // ponytail: basic Markdown flattening, not a renderer; use a Markdown AST if exact rendered-text parity is needed.
  return stripVTControlCharacters(source)
    .replace(/\r\n?/g, "\n")
    .replace(/^[\t ]*[-+*] /gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g, (_match, page, alias) => alias ?? page)
    .replace(/!?\[([^\[\]\n]*)\]\([^\n)]*\)/g, "$1")
    .replace(/^\|[ \-:|]+\|[ \t]*$/gm, "")
    .replace(/\|/g, "\t")
    .replace(/^[ \t]*#{1,6} /gm, "")
    .replace(/^[ \t]*\[[ xX]\] /gm, "")
    .replace(/^[ \t]*\d+[.)] /gm, "")
    .replace(/^[ \t]*(?:`{3,}|~{3,})[^\n]*$/gm, "")
    .replace(/`+/g, "");
}

export function readabilityGrade(source: string): number | undefined {
  // Bound work on the UI thread; never silently score a truncated document.
  if (source.length > 1_000_000) return undefined;
  const parts = plainText(source).split(new RegExp(`(${boundary.source})`, "g"));
  let words = 0, letters = 0, sentences = 0;
  for (let index = 0; index < parts.length; index++) {
    let text = parts[index];
    if (!text.trim() || boundary.test(text)) continue;
    while (parts[index + 1] && parts[index + 2]) {
      const join = continuation(parts[index], parts[index + 2], index === 0 || parts[index - 1].includes("\n"));
      if (!join) break;
      text += parts[index + 1] + parts[index + 2];
      index += 2;
      if (join === "stop") break;
    }
    sentences++;
    words += text.match(/[\w'-]+/g)?.length ?? 0;
    letters += text.match(/\w/g)?.length ?? 0;
  }
  if (!words || !sentences) return undefined;
  return Math.max(0, Math.round((letters / words) * 4.71 + (words / sentences) * 0.5 - 21.43));
}
