import type { Garment, DressCode, Weather } from "./types";
import { NEUTRALS, hasComplementaryPair, sameFamily } from "./color";

export function suggestOutfits(
  all: Garment[],
  weather: Weather,
  opts: { dressCode: DressCode; daysNoRepeat?: number; nowISO?: string },
  maxResults = 3
) {
  const daysNoRepeat = opts.daysNoRepeat ?? 2;
  const nowISO = opts.nowISO ?? new Date().toISOString();
  const t = deriveTarget(weather);

  let pool = all.filter(g => !g.isDirty);
  pool = pool.filter(g => g.dressCodes.includes(opts.dressCode));
  pool = pool.filter(g => notWornRecently(g, nowISO, daysNoRepeat));
  if (t.needWaterproof) {
    pool = pool.filter(g => (g.type==="outerwear"||g.type==="shoe") ? g.waterResistant===1 : true);
  }

  const tops    = byTypeWarmth(pool, "top", t.topWarmth);
  const bottoms = byTypeWarmth(pool, "bottom", t.bottomWarmth);
  const shoes   = byTypeWarmth(pool, "shoe", t.shoeWarmth);
  const outers  = t.outerRequired ? byTypeWarmth(pool, "outerwear", t.outerWarmth) : [null];

  if (!tops.length || !bottoms.length || !shoes.length) {
    return [];
  }

  // Generate diverse suggestions by ensuring variety
  const suggestions: { top: Garment; bottom: Garment; outerwear: Garment | null; shoe: Garment }[] = [];
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  const usedShoes = new Set<string>();
  const usedOuters = new Set<string>();

  // Helper to get unused items
  const getUnused = (items: Garment[], used: Set<string>): Garment[] => 
    items.filter(item => !used.has(item.id));

  // Generate candidates with scoring
  for (let i = 0; i < maxResults; i++) {
    const availTops = getUnused(tops, usedTops);
    const availBottoms = getUnused(bottoms, usedBottoms);
    const availShoes = getUnused(shoes, usedShoes);
    const availOuters = outers[0] === null ? [null] : getUnused(outers as Garment[], usedOuters);

    if (!availTops.length || !availBottoms.length || !availShoes.length) {
      // Fall back to reusing items if we run out
      break;
    }

    // Generate combinations for this suggestion
    const candidates: (Garment|null)[][] = [];
    for (const top of availTops.slice(0, 5)) // Limit to top 5 of each to avoid explosion
      for (const bottom of availBottoms.slice(0, 5))
        for (const shoe of availShoes.slice(0, 5)) {
          if (availOuters[0] === null) {
            candidates.push([top, bottom, null, shoe]);
          } else {
            for (const outer of availOuters.slice(0, 3)) {
              candidates.push([top, bottom, outer, shoe]);
            }
          }
        }

    if (candidates.length === 0) break;

    // Score and add randomness for variety
    const scored = candidates.map(set => ({
      set,
      score: styleScore(set.filter(Boolean) as Garment[]) + rotationBonus(set) + Math.random() * 2
    })).sort((a, b) => b.score - a.score);

    // Pick the best one and mark items as used
    const best = scored[0];
    const [top, bottom, outer, shoe] = best.set;
    
    suggestions.push({ 
      top: top!, 
      bottom: bottom!, 
      outerwear: outer, 
      shoe: shoe! 
    });

    usedTops.add(top!.id);
    usedBottoms.add(bottom!.id);
    usedShoes.add(shoe!.id);
    if (outer) usedOuters.add(outer.id);
  }

  // If we couldn't generate enough unique suggestions, fall back to original method
  if (suggestions.length < maxResults) {
    const candidates: (Garment|null)[][] = [];
    for (const top of tops) for (const bottom of bottoms) for (const shoe of shoes) {
      if (outers[0] === null) candidates.push([top,bottom,null,shoe]);
      else for (const outer of outers) candidates.push([top,bottom,outer!,shoe]);
    }

    const scored = candidates.map(set => ({
      set,
      score: styleScore(set.filter(Boolean) as Garment[]) + rotationBonus(set) + Math.random() * 2
    })).sort((a,b)=>b.score-a.score);

    // Add remaining suggestions avoiding duplicates
    for (const { set } of scored) {
      if (suggestions.length >= maxResults) break;
      const [top, bottom, outer, shoe] = set;
      
      // Check if this combination is already suggested
      const isDuplicate = suggestions.some(s => 
        s.top.id === top!.id && 
        s.bottom.id === bottom!.id && 
        s.shoe.id === shoe!.id
      );
      
      if (!isDuplicate) {
        suggestions.push({ 
          top: top!, 
          bottom: bottom!, 
          outerwear: outer, 
          shoe: shoe! 
        });
      }
    }
  }

  return suggestions.slice(0, maxResults);
}

function deriveTarget(w: Weather) {
  const c = w.tempC;
  let outerRequired=false, topWarmth=1, bottomWarmth=1, outerWarmth=0, shoeWarmth=1;
  if (c <= 5)      { outerRequired=true;  outerWarmth=5; topWarmth=3; bottomWarmth=3; shoeWarmth=3; }
  else if (c <=12) { outerRequired=true;  outerWarmth=4; topWarmth=2; bottomWarmth=2; shoeWarmth=2; }
  else if (c <=19) { outerRequired=false; outerWarmth=3; topWarmth=2; bottomWarmth=2; shoeWarmth=2; }
  else             { outerRequired=false; outerWarmth=0; topWarmth=1; bottomWarmth=1; shoeWarmth=1; }

  if (w.windKph >= 20) outerWarmth = Math.min(5, outerWarmth + 1);
  const needWaterproof = w.chanceOfRain >= 0.4 || w.isSnow;
  return { outerRequired, topWarmth, bottomWarmth, outerWarmth, shoeWarmth, needWaterproof };
}

function notWornRecently(g: Garment, nowISO: string, days: number) {
  if (!g.lastWornAt) return true;
  const ms = Date.parse(nowISO) - Date.parse(g.lastWornAt);
  return (ms / 86400000) >= days;
}

function byTypeWarmth(pool: Garment[], type: Garment["type"], target: number) {
  const filtered = pool.filter(g => g.type === type);
  
  // No warmth filtering for shoes - any shoe works with any weather
  if (type === "shoe") {
    return filtered.sort((a,b) => (a.timesWorn ?? 0) - (b.timesWorn ?? 0));
  }
  
  // Flexible warmth tolerance for tops and bottoms, strict for outerwear
  const win = type === "outerwear" ? 1 : 2;
  return filtered
    .filter(g => Math.abs((g.warmth ?? 2) - target) <= win)
    .sort((a,b) => (a.timesWorn ?? 0) - (b.timesWorn ?? 0));
}

function styleScore(items: Garment[]) {
  const allColors = items.flatMap(i => i.colors.map(c=>c.toLowerCase()));
  const neutrals  = allColors.filter(c => NEUTRALS.has(c));
  const accents   = allColors.filter(c => !NEUTRALS.has(c));
  let s = 0;

  if (neutrals.length >= 2) s += 3;
  if (accents.length === 1) s += 2;
  if (hasComplementaryPair(allColors)) s += 2;
  if (sameFamily(allColors)) s += 2;
  if (accents.length > 2) s -= 3;

  const shoe = items.find(i => i.type === "shoe");
  if (shoe) {
    const shoeCols = shoe.colors.map(c=>c.toLowerCase());
    if (shoeCols.some(c => NEUTRALS.has(c))) s += 2;
    if (shoeCols.some(c => !NEUTRALS.has(c))) s += 1;
  }

  for (const g of items) if (g.favorite) s += 2;
  return s;
}

function rotationBonus(set: (Garment|null)[]) {
  const items = set.filter(Boolean) as Garment[];
  return items.reduce((acc, g) => acc + Math.max(0, 3 - (g.timesWorn ?? 0)), 0);
}