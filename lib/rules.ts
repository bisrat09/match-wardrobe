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

  const candidates: (Garment|null)[][] = [];
  for (const top of tops) for (const bottom of bottoms) for (const shoe of shoes) {
    if (outers[0] === null) candidates.push([top,bottom,null,shoe]);
    else for (const outer of outers) candidates.push([top,bottom,outer!,shoe]);
  }

  const scored = candidates.map(set => ({
    set,
    score: styleScore(set.filter(Boolean) as Garment[]) + rotationBonus(set)
  })).sort((a,b)=>b.score-a.score);

  return scored.slice(0, maxResults).map(({ set }) => {
    const [top,bottom,outer,shoe] = set;
    return { top: top!, bottom: bottom!, outerwear: outer, shoe: shoe! };
  });
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
  const win = 1;
  return pool
    .filter(g => g.type === type)
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