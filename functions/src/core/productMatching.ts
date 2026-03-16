export function normalizeProductText(value: any): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeUnitText(value: any): string {
  return normalizeProductText(value)
    .replace(/\bml\b/g, 'مل')
    .replace(/\bmg\b/g, 'مجم')
    .replace(/\bg\b/g, 'جم')
    .replace(/\btab(?:lets?)?\b/g, 'اقراص')
    .replace(/\bcap(?:sules?)?\b/g, 'كبسول')
    .replace(/\bsyr(?:up)?\b/g, 'شراب')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeProductText(value: any): string[] {
  return normalizeUnitText(value).split(' ').map((item) => item.trim()).filter(Boolean);
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const pairs = new Map<string, number>();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    pairs.set(pair, Number(pairs.get(pair) || 0) + 1);
  }
  let intersection = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = Number(pairs.get(pair) || 0);
    if (count > 0) {
      pairs.set(pair, count - 1);
      intersection += 1;
    }
  }
  return (2 * intersection) / ((a.length - 1) + (b.length - 1));
}

function tokenOverlapRatio(sourceTokens: string[], candidateTokens: string[]): number {
  if (!sourceTokens.length || !candidateTokens.length) return 0;
  const candidateSet = new Set(candidateTokens);
  const hits = sourceTokens.filter((token) => candidateSet.has(token)).length;
  return hits / Math.max(sourceTokens.length, candidateTokens.length);
}

export function computeProductNameScore(sourceName: any, candidateName: any, sourceUnit?: any, candidateVariantHint?: any): number {
  const normalizedSource = normalizeUnitText(sourceName);
  const normalizedCandidate = normalizeUnitText(candidateName);
  if (!normalizedSource || !normalizedCandidate) return 0;
  if (normalizedSource === normalizedCandidate) return 100;

  const sourceTokens = tokenizeProductText(normalizedSource);
  const candidateTokens = tokenizeProductText(normalizedCandidate);
  const overlap = tokenOverlapRatio(sourceTokens, candidateTokens);
  const dice = diceCoefficient(normalizedSource, normalizedCandidate);
  const prefixBonus = normalizedCandidate.startsWith(normalizedSource) || normalizedSource.startsWith(normalizedCandidate) ? 0.08 : 0;
  const containsBonus = normalizedCandidate.includes(normalizedSource) || normalizedSource.includes(normalizedCandidate) ? 0.08 : 0;
  const unitSource = normalizeUnitText(sourceUnit);
  const unitCandidate = normalizeUnitText(candidateVariantHint);
  const unitBonus = unitSource && unitCandidate && unitCandidate.includes(unitSource) ? 0.07 : 0;
  const score = (overlap * 0.52) + (dice * 0.33) + prefixBonus + containsBonus + unitBonus;
  return Math.max(0, Math.min(99, Math.round(score * 100)));
}
