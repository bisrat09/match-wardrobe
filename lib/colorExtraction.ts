import * as ImageManipulator from 'expo-image-manipulator';

// Expanded color palette - 60+ colors
export const COLOR_PALETTE = {
  // Neutrals & Basics
  black: "#000000",
  white: "#FFFFFF",
  gray: "#808080",
  charcoal: "#36454F",
  silver: "#C0C0C0",
  lightgray: "#D3D3D3",
  darkgray: "#4A4A4A",

  // Browns
  brown: "#8B4513",
  beige: "#F5F5DC",
  cream: "#FFFDD0",
  tan: "#D2B48C",
  khaki: "#C3B091",
  chocolate: "#7B3F00",
  coffee: "#6F4E37",
  camel: "#C19A6B",
  sand: "#F4E4C1",

  // Reds & Pinks
  red: "#FF0000",
  darkred: "#8B0000",
  crimson: "#DC143C",
  scarlet: "#FF2400",
  burgundy: "#800020",
  maroon: "#800000",
  pink: "#FFC0CB",
  hotpink: "#FF69B4",
  coral: "#FF7F50",
  salmon: "#FA8072",
  rose: "#FF007F",
  blush: "#FFE0EC",

  // Oranges & Yellows
  orange: "#FFA500",
  darkorange: "#FF8C00",
  peach: "#FFE5B4",
  apricot: "#FBCEB1",
  amber: "#FFBF00",
  yellow: "#FFFF00",
  gold: "#FFD700",
  mustard: "#FFDB58",
  lemon: "#FFF700",
  butter: "#FFFD96",

  // Greens
  green: "#008000",
  darkgreen: "#013220",
  forest: "#228B22",
  olive: "#808000",
  sage: "#9CAF88",
  mint: "#98FF98",
  emerald: "#50C878",
  jade: "#00A36C",
  lime: "#32CD32",
  moss: "#8A9A5B",

  // Blues
  blue: "#0000FF",
  navy: "#000080",
  royalblue: "#4169E1",
  skyblue: "#87CEEB",
  lightblue: "#ADD8E6",
  teal: "#008080",
  turquoise: "#40E0D0",
  aqua: "#00FFFF",
  cobalt: "#0047AB",
  denim: "#1560BD",
  powder: "#B6D7FF",

  // Purples
  purple: "#800080",
  violet: "#8A2BE2",
  lavender: "#E6E6FA",
  plum: "#DDA0DD",
  magenta: "#FF00FF",
  lilac: "#C8A2C8",
  indigo: "#4B0082",
  mauve: "#E0B0FF",
  orchid: "#DA70D6",
};

export const COLOR_NAMES = Object.keys(COLOR_PALETTE);
export const COLOR_VALUES = Object.values(COLOR_PALETTE);

// Helper to get closest color name from RGB
export function getClosestColorName(r: number, g: number, b: number): string {
  let minDistance = Infinity;
  let closestColor = 'gray';

  for (const [name, hex] of Object.entries(COLOR_PALETTE)) {
    const targetR = parseInt(hex.slice(1, 3), 16);
    const targetG = parseInt(hex.slice(3, 5), 16);
    const targetB = parseInt(hex.slice(5, 7), 16);

    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(r - targetR, 2) +
      Math.pow(g - targetG, 2) +
      Math.pow(b - targetB, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = name;
    }
  }

  return closestColor;
}

// Extract dominant colors from image URI
export async function extractColorsFromImage(imageUri: string): Promise<string[]> {
  try {
    // Resize image to speed up processing (smaller = faster)
    const resizedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 150 } }], // Small size for analysis
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!resizedImage.base64) {
      console.warn('No base64 data from image manipulation');
      return [];
    }

    // Convert base64 to pixel data
    const pixels = await getPixelsFromBase64(resizedImage.base64, resizedImage.width, resizedImage.height);

    // Use k-means clustering to find dominant colors
    const dominantColors = extractDominantColors(pixels, 5); // Get top 5 colors

    // Map to closest named colors from our palette
    const namedColors = dominantColors.map(rgb =>
      getClosestColorName(rgb.r, rgb.g, rgb.b)
    );

    // Remove duplicates and limit to 3 most dominant
    return [...new Set(namedColors)].slice(0, 3);

  } catch (error) {
    console.error('Error extracting colors:', error);
    return [];
  }
}

// Convert base64 image to pixel array
async function getPixelsFromBase64(base64: string, width: number, height: number): Promise<{r: number, g: number, b: number}[]> {
  // For React Native, we'll sample pixels from the base64 data
  // This is a simplified approach - in production you might want a native module

  const pixels: {r: number, g: number, b: number}[] = [];

  // Sample every 10th pixel to speed up processing
  const sampleRate = 10;
  const imageData = atob(base64);

  // Very simplified pixel sampling - in real app you'd decode JPEG properly
  // For now, we'll return some default colors based on image analysis
  // This is a placeholder - proper implementation would decode JPEG

  // Return sample pixels (placeholder)
  return [
    {r: 128, g: 128, b: 128},
    {r: 64, g: 64, b: 64},
    {r: 192, g: 192, b: 192}
  ];
}

// Simple k-means clustering for dominant colors
function extractDominantColors(
  pixels: {r: number, g: number, b: number}[],
  k: number = 5
): {r: number, g: number, b: number}[] {

  if (pixels.length === 0) return [];
  if (pixels.length <= k) return pixels;

  // Initialize centroids randomly from pixels
  const centroids = [];
  const usedIndices = new Set<number>();

  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!usedIndices.has(idx)) {
      centroids.push({...pixels[idx]});
      usedIndices.add(idx);
    }
  }

  // Run k-means iterations
  for (let iteration = 0; iteration < 10; iteration++) {
    // Assign pixels to nearest centroid
    const clusters: {r: number, g: number, b: number}[][] = Array(k).fill(null).map(() => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestCentroid = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = Math.sqrt(
          Math.pow(pixel.r - centroids[i].r, 2) +
          Math.pow(pixel.g - centroids[i].g, 2) +
          Math.pow(pixel.b - centroids[i].b, 2)
        );

        if (dist < minDist) {
          minDist = dist;
          closestCentroid = i;
        }
      }

      clusters[closestCentroid].push(pixel);
    }

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const sum = clusters[i].reduce(
          (acc, pixel) => ({
            r: acc.r + pixel.r,
            g: acc.g + pixel.g,
            b: acc.b + pixel.b
          }),
          {r: 0, g: 0, b: 0}
        );

        centroids[i] = {
          r: Math.round(sum.r / clusters[i].length),
          g: Math.round(sum.g / clusters[i].length),
          b: Math.round(sum.b / clusters[i].length)
        };
      }
    }
  }

  return centroids;
}

// Get color value from name or hex
export function getColorValue(color: string): string {
  // If it's a named color from our palette
  if (color in COLOR_PALETTE) {
    return COLOR_PALETTE[color as keyof typeof COLOR_PALETTE];
  }

  // If it starts with #, assume it's already a hex color
  if (color.startsWith('#')) {
    return color;
  }

  // Default fallback
  return '#808080';
}

// Extract colors from a pixel at specific coordinates (for eyedropper)
export async function getColorAtPoint(
  imageUri: string,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number
): Promise<string> {
  try {
    // Get a 1x1 pixel crop at the specified point
    const croppedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{
        crop: {
          originX: Math.max(0, Math.min(x, imageWidth - 1)),
          originY: Math.max(0, Math.min(y, imageHeight - 1)),
          width: 1,
          height: 1
        }
      }],
      { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    // For simplicity, return a default color
    // In production, you'd decode the base64 and get the actual pixel color
    // This would require a proper image decoding library
    return getClosestColorName(128, 128, 128);

  } catch (error) {
    console.error('Error getting color at point:', error);
    return 'gray';
  }
}