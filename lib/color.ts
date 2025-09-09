export const NEUTRALS = new Set([
  "black", "white", "gray", "grey", "navy", "tan", "beige", "olive", 
  "khaki", "denim", "cream", "brown"
]);

const buckets: Record<string,string[]> = {
  blue: ["blue", "lightblue", "navy", "teal", "turquoise", "cyan"],
  orange: ["orange", "rust", "coral", "amber"],
  red: ["red", "maroon", "burgundy", "pink"],
  green: ["green", "olive", "forest"],
  yellow: ["yellow", "mustard", "gold"],
  purple: ["purple", "violet", "lilac", "magenta"]
};

export function hasComplementaryPair(colors: string[]) {
  const has = (group: string[]) => group.some(c => colors.includes(c));
  const pairs: [keyof typeof buckets, keyof typeof buckets][] = [
    ["blue","orange"], ["red","green"], ["yellow","purple"]
  ];
  return pairs.some(([a,b]) => has(buckets[a]) && has(buckets[b]));
}

export function sameFamily(colors: string[]) {
  const nonNeutral = colors.filter(c => !NEUTRALS.has(c));
  if (nonNeutral.length <= 1) return true;
  const families = Object.entries(buckets).filter(([_k, vals]) =>
    nonNeutral.some(c => vals.includes(c))
  );
  return families.length === 1;
}