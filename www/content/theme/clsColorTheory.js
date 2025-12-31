// clsColorTheory.js
// Requires: themeColors.js (object of named colors)

class clsColorTheory
{
  /**
   * @param {object} themeColors
   *   An object (possibly nested) whose leaves are string hex values (e.g., "#ff00aa" or "0F0").
   *   The class will flatten this palette internally.
   */
  constructor(themeColors)
  {
    this.themeColors = themeColors;
    this.themeColorList = this.flattenPalette(themeColors);
    this.suggestedAdditions = [];
    this.hexToNameMap = this.generateHexToNameMap();
  }

  /**
   * Recursively traverse a nested palette object/array structure to produce
   * a flat array of `{ name: string, hex: string }` entries.
   *
   * @param {object|array} obj
   *   The nested palette structure. Objects: keys → either string hex, array, or nested object.
   *   Arrays: elements may be strings or nested objects/arrays.
   * @param {string} prefix
   *   (Optional) The prefix string used to generate the “name” for nested entries.
   *   Default: `''`.
   *
   * @returns {Array<{ name: string, hex: string }>}
   *   A flat list of objects, each with:
   *     - `name`: concatenated key path (e.g., `"primary-0-secondary-2"`)
   *     - `hex`: the raw string from the leaf (not yet normalized)
   */
  flattenPalette(obj, prefix = '')
  {
    const result = [];
    for (const [key, value] of Object.entries(obj))
    {
      if (typeof value === 'string')
      {
        result.push({ name: prefix + key, hex: value });
      }
      else if (Array.isArray(value))
      {
        value.forEach((v, idx) =>
        {
          if (typeof v === 'string')
          {
            result.push({ name: `${prefix}${key}-${idx}`, hex: v });
          }
          else if (v && typeof v === 'object')
          {
            result.push(...this.flattenPalette(v, `${prefix}${key}-${idx}-`));
          }
        });
      }
      else if (value && typeof value === 'object')
      {
        result.push(...this.flattenPalette(value, prefix + key + '-'));
      }
      // other primitives are skipped
    }
    return result;
  }

  /**
   * Build a map from normalized hex color string ("#rrggbb") → palette key/name.
   * Skips invalid hex entries quietly.
   *
   * @returns {Object.<string, string>}
   *   An object where each key is a normalized hex (e.g., "#aabbcc"), and each
   *   value is the corresponding name from `this.themeColorList`.
   */
  generateHexToNameMap()
  {
    const map = {};
    for (const { name, hex } of this.themeColorList) {
      try {
        map[this.normalizeHex(hex)] = name;
      }
      catch {
        // skip any bad entries
      }
    }
    return map;
  }

  /**
   * Convert a hex string to an RGB object with integer channels [0..255].
   *
   * @param {string} hex
   *   Any valid hex string (3- or 6-digit, with or without `#`).
   * @returns {{ r: number, g: number, b: number }}
   *   Example: `hexToRgb("#ff0000")` → `{ r: 255, g: 0, b: 0 }`.
   * @throws {Error} If `hex` is not valid.
   */
  hexToRgb(hex)
  {
    const norm = this.normalizeHex(hex);
    const h = norm.slice(1);
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  /**
   * Convert an RGB color (0–255) to CIE L*a*b* color space.
   *
   * @param {{ r: number, g: number, b: number }} rgb
   *   Each channel ∈ [0..255].
   * @returns {{ L: number, a: number, b: number }}
   *   L*: [0..100], a*, b* can be positive/negative floats.
   */
  rgbToLab({ r, g, b })
  {
    const [R, G, B] = [r, g, b].map(v =>
    {
      v = v / 255;
      return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
    });

    const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.00000;
    const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;

    const xyzToLab = v => v > 0.008856 ? Math.pow(v, 1 / 3) : 7.787 * v + 16 / 116;
    const [fx, fy, fz] = [x, y, z].map(xyzToLab);

    return {
      L: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz)
    };
  }

  /**
   * Compute relative luminance per WCAG (linearized sRGB).
   *
   * @param {{ r: number, g: number, b: number }}
   *   Each channel ∈ [0..255].
   * @returns {number}
   *   A float ∈ [0..1], where 0 is darkest and 1 is brightest.
   */
  relativeLuminance({ r, g, b })
  {
    const f = c =>
    {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  /**
   * Compute Euclidean distance between two RGB triples:
   *   - If `useLab === false`: in plain RGB-space: sqrt((r1−r2)² + (g1−g2)² + (b1−b2)²).
   *   - If `useLab === true`: convert each RGB → Lab, then Euclidean distance in L*a*b* space.
   *
   * @param {{ r: number, g: number, b: number }} c1
   * @param {{ r: number, g: number, b: number }} c2
   * @param {boolean} [useLab=false]
   *   Whether to compute distance in L*a*b* color space. Default: `false`.
   * @returns {number}
   *   The computed Euclidean distance.
   */
  colorDistance(c1, c2, useLab = false)
  {
    if(useLab)
    {
      const lab1 = this.rgbToLab(c1);
      const lab2 = this.rgbToLab(c2);
      return Math.sqrt(
        Math.pow(lab1.L - lab2.L, 2) +
        Math.pow(lab1.a - lab2.a, 2) +
        Math.pow(lab1.b - lab2.b, 2)
      );
    }
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  /**
   * Convert integer RGB channels [0..255] → HSL (Hue [0..360), Sat [0..1], Light [0..1]).
   *
   * @param {number} r  Red  channel ∈ [0..255]
   * @param {number} g  Green channel ∈ [0..255]
   * @param {number} b  Blue channel ∈ [0..255]
   * @returns {[number, number, number]}
   *   An array [h, s, l], where:
   *     - h ∈ [0..360) (degrees)
   *     - s ∈ [0..1]
   *     - l ∈ [0..1]
   */
  rgbToHsl(r, g, b)
  {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if(max === min)
    {
      h = s = 0;
    }
    else
    {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max)
      {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return [h, s, l];
  }

  /**
   * Convert HSL floats → normalized hex string.
   *
   * @param {number} h
   *   Hue angle in degrees ∈ [0..360). Values ≥360 wrap via modulo.
   * @param {number} s
   *   Saturation ∈ [0..1].
   * @param {number} l
   *   Lightness ∈ [0..1].
   * @returns {string}
   *   A normalized hex string: `#rrggbb` (lowercase).
   */
  hslToHex(h, s, l)
  {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let [r, g, b] = [0, 0, 0];

    if(h < 60) [r, g, b] = [c, x, 0];
    else if(h < 120) [r, g, b] = [x, c, 0];
    else if(h < 180) [r, g, b] = [0, c, x];
    else if(h < 240) [r, g, b] = [0, x, c];
    else if(h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];

    const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Rotate a hue value around the color wheel by a specified number of degrees.
   *
   * @param {number} h
   *   The base hue angle in degrees (0 ≤ h < 360). Values ≥360 will wrap via modulo.
   * @param {number} deg
   *   The number of degrees to rotate the hue. May be positive or negative.
   * @returns {number}
   *   The resulting hue angle normalized to the range [0, 360).
   *
   * @example
   * // Rotate a hue of 30° by +150° → 180°
   * rotateHue(30, 150); // → 180
   *
   * @example
   * // Rotate a hue of 350° by +30° → (380 % 360) → 20°
   * rotateHue(350, 30); // → 20
   */
  rotateHue(h, deg) 
  {
    return (h + deg + 360) % 360;
  }

  /**
   * Generate a small “hue-shifted” palette around the input color.
   * Internally:
   *   1. hex → [r,g,b] → [h,s,l]
   *   2. For offset in [−range, −range+10, …, +range]:
   *        compute newHue = (h + offset + 360) % 360
   *        assemble new color = hslToHex(newHue, s, l)
   *
   * @param {string} hex
   *   The base hex string (any valid form).
   * @param {number} [range=30]
   *   Hue-offset range in degrees. Generates steps of 10° from −range to +range.
   *   Default: `30`.
   * @returns {string[]}
   *   An array of hex strings (length = `(2*range / 10) + 1`), including original at offset 0.
   */
  getHueRange(hex, range = 30)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    const hues = [];
    for (let offset = -range; offset <= range; offset += 10)
    {
      hues.push(this.hslToHex((h + offset + 360) % 360, s, l));
    }
    return hues;
  }

  /**
   * Given a numeric contrast ratio, return an object with:
   *   - ratio: parsed float
   *   - rating: { 'AAA' | 'AA' | 'AA Large' | 'Fail' }
   *
   * @param {number|string} ratio
   *   Contrast ratio (≥ 1.0). Can be a number or numeric-string.
   * @returns {{ ratio: number, rating: string }}
   *   Example:
   *     getContrastRating(7.2)       → { ratio: 7.2,  rating: 'AAA' }
   *     getContrastRating("4.8")     → { ratio: 4.8,  rating: 'AA' }
   *     getContrastRating(3.5)       → { ratio: 3.5,  rating: 'AA Large' }
   *     getContrastRating(2.0)       → { ratio: 2.0,  rating: 'Fail' }
   */
  getContrastRating(ratio)
  {
    const r = parseFloat(ratio);
    if(r >= 7.0) return {ratio: r, rating: 'AAA'};
    if(r >= 4.5) return {ratio: r, rating: 'AA'};
    if(r >= 3.0) return {ratio: r, rating: 'AA Large'};
                 return {ratio: r, rating: 'Fail'};
  }

  /**
   * Compute WCAG contrast ratio (≥1.0) between two hex colors.
   *
   * @param {string} hex1
   *   First color (any valid 3- or 6-digit hex).
   * @param {string} hex2
   *   Second color.
   * @returns {number}
   *   Contrast ratio = (L1 + 0.05) / (L2 + 0.05), where:
   *     - L1 = max(relativeLuminance(hex1), relativeLuminance(hex2))
   *     - L2 = min(relativeLuminance(hex1), relativeLuminance(hex2))
   *   Always ≥ 1.0; higher means more contrast.
   */
  getContrastRatio(hex1, hex2)
  {
    const rgb1 = this.hexToRgb(hex1);
    const rgb2 = this.hexToRgb(hex2);

    const lum1 = this.relativeLuminance(rgb1);
    const lum2 = this.relativeLuminance(rgb2);
    const brighter = Math.max(lum1, lum2);
    const darker   = Math.min(lum1, lum2);

    return (brighter + 0.05) / (darker + 0.05);
  }

  /**
   * For each unique pair in `palette` (array of hex strings), compute:
   *   - `ratio` = getContrastRatio(fg, bg)
   *   - `rating` = getContrastRating(ratio)
   * Returns an array of objects:
   *   [{ fg: '#rrggbb', bg: '#rrggbb', ratio: number, rating: string }, …]
   *
   * @param {string[]} palette
   *   Array of (possibly unnormalized) hex strings.
   * @returns {Array<{ fg: string, bg: string, ratio: number, rating: string }>}
   */
  auditContrastPalette(palette)
  {
    const results = [];
    for (let i = 0; i < palette.length; i++)
    {
      for (let j = i + 1; j < palette.length; j++)
      {
        const ratio = this.getContrastRatio(palette[i], palette[j]);
        const rating = this.getContrastRating(ratio);
        results.push({ fg: palette[i], bg: palette[j], ratio, rating });
      }
    }
    return results;
  }

  /**
   * Among all entries in `this.themeColorList` (flattened palette), find
   * the color whose hex is “closest” (minimum Euclidean distance) to `hex`.
   *
   * @param {string} hex
   *   Any valid hex string. Will be normalized internally.
   * @param {boolean} [useLab=false]
   *   If true, compare distances in Lab space; else RGB. Default: `false`.
   * @returns {{
   *   match: string,    // palette name of the closest match
   *   hex: string,      // matched hex (normalized)
   *   suggested: boolean // true if input was not an exact match in legend
   * }}
   *
   * Side Effect:
   *   - If no exact match (`normalized inputHex !== matchedHex`),
   *     pushes `normalized inputHex` into `this.suggestedAdditions[]` (to suggest adding it).
   */
  getClosestMatch(hex, useLab = false)
  {
    const inputRgb = this.hexToRgb(hex);
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const color of this.themeColorList)
    {
      const dist = this.colorDistance(inputRgb, this.hexToRgb(color.hex), useLab);
      if(dist < bestDistance)
      {
        bestDistance = dist;
        bestMatch = color;
      }
    }

    const isExact = bestMatch.hex.toLowerCase() === hex.toLowerCase();
    if(!isExact)
    {
      this.suggestedAdditions.push(hex);
    }

    return {
      match: bestMatch.name,
      hex: bestMatch.hex,
      suggested: !isExact
    };
  }

  /**
   * Pick a “legible” text color (black or white) on top of the given background.
   * Uses a simple perceived brightness formula:
   *   luminance = 0.299⋅r + 0.587⋅g + 0.114⋅b
   * If luminance > 186 → return 'black'; else return 'white'.
   *
   * @param {string} hex
   *   Any valid hex color.
   * @returns {'black'|'white'}
   */
  getContrastColor(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186 ? 'black' : 'white';
  }

/**
 * Given an array of hex colors, generate harmonious “suggested” colors
 * (complementary, analogous, and triadic) for each input, then return
 * the unique normalized hex values that are not already in the provided palette.
 *
 * @param {string[]} palette
 *   An array of input hex strings (3- or 6-digit, with or without `#`).
 * @returns {string[]}
 *   An array of normalized hex strings (`#rrggbb`) representing colors
 *   that complement the input palette, excluding any that already appear in it.
 *
 * @example
 * // If your palette contains only a single red:
 * getSuggestedAdditions(['#ff0000']);
 * // → might return ['#00ffff', '#ff00ff', '#ffff00'] (cyan, magenta, yellow)
 *
 * @example
 * // For a two-color palette:
 * getSuggestedAdditions(['#0ea5e9', '#facc15']);
 * // → might return the complementary/analogous/triadic of each, minus the originals.
 */
getSuggestedAdditions(palette) 
{
  // Normalize the input palette and build a Set for quick exclusion.
  const normalizedInput = new Set();
  for (const rawHex of palette) 
  {
    try 
    {
      normalizedInput.add(this.normalizeHex(rawHex));
    } 
    catch 
    {
      // Skip any invalid hex in the input palette.
    }
  }

  // Helper to convert one hex → [h, s, l].
  const hexToHSL = (hex) => {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHsl(r, g, b);
  };

  const suggestions = new Set();

  for (const hex of normalizedInput) 
  {
    // Compute HSL once per color.
    const [h, s, l] = hexToHSL(hex);

    // 1) Complementary
    try {
      const [compHex] = this.getComplementary(h, s, l);
      const normComp = this.normalizeHex(compHex);
      if (!normalizedInput.has(normComp)) 
      {
        suggestions.add(normComp);
      }
    } catch {
      // If any step fails (invalid), skip.
    }

    // 2) Analogous (two hues: h-30, h+30)
    try {
      const analogues = this.getAnalogous(h, s, l);
      for (const aHex of analogues) 
      {
        const normA = this.normalizeHex(aHex);
        if (!normalizedInput.has(normA)) 
        {
          suggestions.add(normA);
        }
      }
    } catch {
      // Skip invalid
    }

    // 3) Triadic (two hues: h+120, h+240)
    try {
      const triads = this.getTriadic(h, s, l);
      for (const tHex of triads) 
      {
        const normT = this.normalizeHex(tHex);
        if (!normalizedInput.has(normT)) 
        {
          suggestions.add(normT);
        }
      }
    } catch {
      // Skip invalid
    }
  }

  return Array.from(suggestions);
}

  /**
   * Build a comprehensive palette object from a single base hex:
   *
   * @param {string} hex
   *   Any valid hex for base color.
   * @returns {object}  // See below
   * {
   *   primary: [ baseHex ],
   *   accentPalette: [two accent hexes],
   *   complementary: [one hex],
   *   analogous: [two hexes],
   *   triadic: [two hexes],
   *   splitComplementary: [two hexes],
   *   tetradic: [four hexes],
   *   square: [four hexes],
   *   monochromatic: [five hexes],
   *   muted: [three hexes],
   *   gradient: [array of 5 hexes],
   *   materialShades: [array of 11 hexes]
   * }
   */
  getColorPalette(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);

    return {
      primary: [hex],
      accentPalette: this.getAccentPalette(hex),
      complementary: this.getComplementary(h, s, l),
      analogous: this.getAnalogous(h, s, l),
      triadic: this.getTriadic(h, s, l),
      splitComplementary: this.getSplitComplementary(h, s, l),
      tetradic: this.getTetradic(hex, h, s, l),
      square: this.getSquare(h, s, l),
      monochromatic: this.getMonochromatic(h, s),
      muted: this.getMutedPalette(hex),
      gradient: this.getGradientStops(hex),
      materialShades: this.getMaterialShades(hex)
    };
  }

  /**
   * Given a “purpose” string, return a small object of colors chosen
   * from the theme (via getClosestMatch):
   *
   * @param {string} targetPurpose
   *   One of: 'button', 'form', 'card'. Defaults to `{}` if unknown.
   *
   * @returns {object}
   *   If 'button': { base, hover, active }
   *   If 'form':   { background, label, error }
   *   If 'card':   { background, border, text }
   *   Else:        {}  
   *
   * Internally uses getClosestMatch() on hard-coded reference hexes.
   */
  recommendPaletteFromTheme(targetPurpose)
  {
    switch (targetPurpose)
    {
      case 'button':
        return {
          base: this.getClosestMatch('#0ea5e9').hex,
          hover: this.getClosestMatch('#0284c7').hex,
          active: this.getClosestMatch('#0369a1').hex
        };
      case 'form':
        return {
          background: this.getClosestMatch('#f8fafc').hex,
          label: this.getClosestMatch('#1f2937').hex,
          error: this.getClosestMatch('#dc2626').hex
        };
      case 'card':
        return {
          background: this.getClosestMatch('#ffffff').hex,
          border: this.getClosestMatch('#e5e7eb').hex,
          text: this.getClosestMatch('#111827').hex
        };
      default:
        return {};
    }
  }

  /**
   * Given an array of hex strings (possibly invalid/malformed), filter+normalize,
   * remove duplicates, then build a string of `<div>` elements suitable for injection
   * into an HTML grid. Each div:
   *   - class="${size}"
   *   - style="background-color: <normalizedHex>"
   *   - innerText = normalizedHex
   *
   * @param {string[]} palette
   *   Array of hex color strings.
   * @param {string} [size='h-40 w-40']
   *   Tailwind-style classes for width/height. Default: `'h-40 w-40'`.
   * @returns {string}
   *   A string containing `<div …>${hex}</div>` lines joined by `\n`.
   */
  renderPaletteGrid(palette, size = 'h-40 w-40')
  {
    const seen = new Set();
    const items = palette
      .map(hex =>
      {
        try
        {
          return this.normalizeHex(hex);
        }
        catch
        {
          return null;
        }
      })
      .filter(hex => hex && !seen.has(hex) && seen.add(hex))
      .map(validHex =>
      {
        return `<div class="${size}" style="background-color: ${validHex}">${validHex}</div>`;
      })
      .join('\n');

    return items;
  }

  /**
   * Simply return `JSON.stringify(palette, null, 2)`.
   * Useful for serializing a raw array or object of hexes.
   *
   * @param {object|array} palette
   * @returns {string}
   *   Pretty-printed JSON (2-space indent).
   */
  exportPaletteAsJSON(palette)
  {
    return JSON.stringify(palette, null, 2);
  }

  /**
   * Build a JS object suitable for inlining into a `tailwind.config.js`:
   * {
   *   theme: {
   *     extend: {
   *       colors: {
   *         [name]: {
   *           0:  palette[0],
   *           100: palette[1],
   *           200: palette[2],
   *           … etc. (key = index×100)
   *         }
   *       }
   *     }
   *   }
   * }
   *
   * @param {string} [name='customPalette']
   * @param {string[]} palette
   *   Array of hex strings (length N). The produced keys will be 0, 100, 200, … (index×100).
   * @returns {object}
   *   The JS object you can assign to `module.exports` in `tailwind.config.js`.
   */
  exportTailwindPalette(name = 'customPalette', palette)
  {
    const entries = palette.reduce((acc, hex, i) =>
    {
      acc[i * 100] = hex;
      return acc;
    }, {});
    return {
      theme: 
      {
        extend:
        {
          colors: 
          {
            [name]: entries
          }
        }
      }
    };
  }

  /**
   * Build a CSS `:root { … }` block defining CSS variables:
   *   If palette = { key1: '#aaa', key2: ['#111', '#222'], … },
   *   then:
   *     --clr-key1: #aaa;
   *     --clr-key2-1: #111;
   *     --clr-key2-2: #222;
   *
   * @param {object} palette
   *   A map from keys → either string or array-of-strings.
   * @param {string} [prefix='--clr']
   * @returns {string}
   *   A string of the form:
   *     :root {
   *       --clr-key1: #aaa;
   *       --clr-key2-1: #111;
   *       --clr-key2-2: #222;
   *       …
   *     }
   */
  exportPaletteCSSVars(palette, prefix = '--clr')
  {
    let cssVars = `:root {\n`;

    for (const [name, value] of Object.entries(palette))
    {
      if (Array.isArray(value))
      {
        value.forEach((v, i) =>
        {
          cssVars += `  ${prefix}-${name}-${i + 1}: ${v};\n`;
        });
      }
      else
      {
        cssVars += `  ${prefix}-${name}: ${value};\n`;
      }
    }

    cssVars += `}`;
    return cssVars;
  }

  /**
   * Build a SCSS map:
   *   $themeColors: (
   *     key1: #aaa,
   *     key2: (
   *       1: #111,
   *       2: #222,
   *     ),
   *     …
   *   );
   *
   * @param {object} palette
   *   Map from keys → string or array of strings.
   * @param {string} [name='themeColors']
   * @returns {string}
   *   A multiline SCSS map block (ending with ‘);’).
   */
  exportPaletteSCSSMap(palette, name = 'themeColors')
  {
    let scssMap = `$${name}: (\n`;

    for (const [key, value] of Object.entries(palette))
    {
      if (Array.isArray(value))
      {
        scssMap += `  ${key}: (\n`;
        value.forEach((v, i) =>
        {
          scssMap += `    ${i + 1}: ${v},\n`;
        });
        scssMap += `  ),\n`;
      }
      else
      {
        scssMap += `  ${key}: ${value},\n`;
      }
    }

    scssMap += `);`;
    return scssMap;
  }

  /**
   * Analyze a flat palette (array of hex strings) and categorize each as “warm” vs. “cool”:
   *   - Convert each hex → [r,g,b] → [h,s,l], then:
   *     hue ∈ [0..90] ∪ [330..360] → “warm”, else “cool”.
   * Returns an object:
   *   {
   *     warm:   <number of warm>,
   *     cool:   <number of cool>,
   *     total:  <palette.length>,
   *     breakdown: [
   *       { hex: '#rrggbb', hue: 'xx.x', category: 'warm'| 'cool' }, …
   *     ]
   *   }
   *
   * @param {string[]} palette
   *   Array of hex strings.
   * @returns {{
   *   warm: number,
   *   cool: number,
   *   total: number,
   *   breakdown: Array<{ hex: string, hue: string, category: string }>
   * }}
   */
  summarizePalette(palette)
  {
    let warm = 0, cool = 0;
    const results = palette.map(hex => {
      const { r, g, b } = this.hexToRgb(hex);
      const [h] = this.rgbToHsl(r, g, b);
      const category = (h >= 0 && h <= 90) || (h >= 330 && h <= 360) ? 'warm' : 'cool';
      if (category === 'warm') warm++; else cool++;
      return { hex, hue: h.toFixed(1), category };
    });
    return { warm, cool, total: palette.length, breakdown: results };
  }

  /**
   * For a single hex color, return:
   *   {
   *     hex: '#rrggbb',
   *     hsl: [h, s, l],
   *     emotion: <string>
   *   }
   *
   * Emotion mapping (by hue):
   *   - [0..15)   → 'passion / energy / urgency'      (red)
   *   - [15..45)  → 'warmth / optimism / youth'        (orange)
   *   - [45..65)  → 'happiness / positivity'           (yellow)
   *   - [65..150) → 'growth / balance / calm'          (green)
   *   - [150..200)→ 'refreshing / tranquility'         (teal)
   *   - [200..250)→ 'trust / professionalism'          (blue)
   *   - [250..290)→ 'creativity / imagination'         (purple)
   *   - [290..330)→ 'luxury / romance / mystery'       (magenta)
   *   - [330..360)→ 'boldness / power / passion'       (red-return)
   *
   * Additional nuance if saturation < 0.2:
   *   - l > 0.9  → 'purity / cleanliness / simplicity'   (near white)
   *   - l < 0.1  → 'sophistication / mystery / elegance' (near black)
   *   - otherwise → 'neutral / minimal / professional'   (gray-like)
   *
   * @param {string} hex
   * @returns {{ hex: string, hsl: [number, number, number], emotion: string }}
   */
  getColorEmotionProfile(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);

    const hue = h;
    let emotion = 'neutral';

    // Base hue emotion mapping
    if (hue >= 0 && hue < 15) emotion = 'passion / energy / urgency';        // red
    else if (hue >= 15 && hue < 45) emotion = 'warmth / optimism / youth';  // orange
    else if (hue >= 45 && hue < 65) emotion = 'happiness / positivity';     // yellow
    else if (hue >= 65 && hue < 150) emotion = 'growth / balance / calm';   // green
    else if (hue >= 150 && hue < 200) emotion = 'refreshing / tranquility'; // teal
    else if (hue >= 200 && hue < 250) emotion = 'trust / professionalism';  // blue
    else if (hue >= 250 && hue < 290) emotion = 'creativity / imagination'; // purple
    else if (hue >= 290 && hue < 330) emotion = 'luxury / romance / mystery'; // magenta
    else emotion = 'boldness / power / passion';                            // red again (330–360)

    // Consider low saturation and brightness for nuance
    if (s < 0.2 && l > 0.9)
    {
      emotion = 'purity / cleanliness / simplicity'; // near white
    }
    else if (s < 0.2 && l < 0.1)
    {
      emotion = 'sophistication / mystery / elegance'; // near black
    }
    else if (s < 0.2)
    {
      emotion = 'neutral / minimal / professional'; // gray-like
    }

    return {
      hex,
      hsl: [h, s, l],
      emotion
    };
  }

  /**
   * Given an array of hex colors, return each color’s emotion profile
   * and a summary of the combined emotional profile.
   *
   * For each valid hex in the input:
   *   - Calls `getColorEmotionProfile(hex)` → { hex, hsl, emotion }
   *   - Collects all emotion strings into a list
   *
   * The summary includes:
   *   - `uniqueEmotions`: de-duplicated list of all emotions found
   *   - `emotionCounts`: a mapping { emotion: number of occurrences }
   *   - `dominantEmotions`: array of emotion(s) with the highest count
   *
   * @param {string[]} palette
   *   An array of hex strings (3- or 6-digit, with or without `#`).
   * @returns {{
   *   profiles: Array<{ hex: string, hsl: [number, number, number], emotion: string }>,
   *   uniqueEmotions: string[],
   *   emotionCounts: { [emotion: string]: number },
   *   dominantEmotions: string[]
   * }}
   *   - `profiles`: emotion-profile objects for each valid input hex
   *   - `uniqueEmotions`: de-duplicated emotion strings across all profiles
   *   - `emotionCounts`: count of how many times each emotion appears
   *   - `dominantEmotions`: array of emotion(s) with the highest count (empty if no valid colors)
   *
   * @example
   * // For a palette with ties:
   * getEmotionProfiles([
   *   '#ff0000', // 'passion / energy / urgency'
   *   '#00ff00', // 'growth / balance / calm'
   *   '#ff0000', // 'passion / energy / urgency'
   *   '#0000ff', // 'trust / professionalism'
   *   '#00ff00'  // 'growth / balance / calm'
   * ]);
   * // → {
   * //     profiles: [
   * //       { hex: '#ff0000', hsl: [0,1,0.5],    emotion: 'passion / energy / urgency' },
   * //       { hex: '#00ff00', hsl: [120,1,0.5],  emotion: 'growth / balance / calm' },
   * //       { hex: '#ff0000', hsl: [0,1,0.5],    emotion: 'passion / energy / urgency' },
   * //       { hex: '#0000ff', hsl: [240,1,0.5],  emotion: 'trust / professionalism' },
   * //       { hex: '#00ff00', hsl: [120,1,0.5],  emotion: 'growth / balance / calm' }
   * //     ],
   * //     uniqueEmotions: [
   * //       'passion / energy / urgency',
   * //       'growth / balance / calm',
   * //       'trust / professionalism'
   * //     ],
   * //     emotionCounts: {
   * //       'passion / energy / urgency': 2,
   * //       'growth / balance / calm': 2,
   * //       'trust / professionalism': 1
   * //     },
   * //     dominantEmotions: [
   * //       'passion / energy / urgency',
   * //       'growth / balance / calm'
   * //     ]
   * //   }
   */
  getEmotionProfiles(palette) 
  {
    const profiles = [];
    const counts = {};

    for (const rawHex of palette) 
    {
      let profile;
      try 
      {
        profile = this.getColorEmotionProfile(rawHex);
      } 
      catch 
      {
        continue; // skip invalid hex
      }

      profiles.push(profile);

      const emo = profile.emotion;
      counts[emo] = (counts[emo] || 0) + 1;
    }

    // Build de-duplicated list of emotions
    const uniqueEmotions = Object.keys(counts);

    // Determine max count
    let maxCount = 0;
    for (const cnt of Object.values(counts)) 
    {
      if (cnt > maxCount) 
      {
        maxCount = cnt;
      }
    }

    // Collect all emotions whose count == maxCount
    const dominantEmotions = [];
    if (maxCount > 0) 
    {
      for (const [emo, cnt] of Object.entries(counts)) 
      {
        if (cnt === maxCount) 
        {
          dominantEmotions.push(emo);
        }
      }
    }

    return {
      profiles,
      uniqueEmotions,
      emotionCounts: counts,
      dominantEmotions
    };
  }

  /**
   * Blend two colors together by a given ratio, returning the resulting hex.
   *
   * @param {string} hex1
   *   The first color, as any valid 3- or 6-digit hex string (with or without `#`).
   * @param {string} hex2
   *   The second color, as any valid 3- or 6-digit hex string (with or without `#`).
   * @param {number} [amount=0.5]
   *   The blend fraction (0 ≤ amount ≤ 1).  
   *   - 0 → returns hex1 exactly  
   *   - 1 → returns hex2 exactly  
   *   - 0.5 → returns the midpoint between hex1 and hex2
   * @returns {string}
   *   The blended color as a normalized hex string (`#rrggbb`).
   *
   * @throws {Error}
   *   If either `hex1` or `hex2` is not a valid hex color.
   *
   * @example
   * // Blend pure red (#ff0000) and pure blue (#0000ff) at 50% → purple (#800080)
   * blendColors('#ff0000', '#0000ff', 0.5); // → "#800080"
   *
   * @example
   * // If amount is 0.25, the result is 75% hex1 + 25% hex2
   * blendColors('#ff0000', '#0000ff', 0.25); // → "#bf003f"
   */
  blendColors(hex1, hex2, amount = 0.5)
  {
    const c1 = this.hexToRgb(hex1);
    const c2 = this.hexToRgb(hex2);
    const blend = {
      r: Math.round(c1.r + (c2.r - c1.r) * amount),
      g: Math.round(c1.g + (c2.g - c1.g) * amount),
      b: Math.round(c1.b + (c2.b - c1.b) * amount)
    };
    return `#${((1 << 24) + (blend.r << 16) + (blend.g << 8) + blend.b).toString(16).slice(1)}`;
  }

  /**
   * Return a 4-color “split-tetradic” scheme around a base HSL:
   *   [ baseHex, (h + 60)° , (h + 180)° , (h + 240)° ]
   *
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Four-element array of hex strings in the above order.
   */
  getSplitTetradicPalette(h, s, l)
  {
    return [
      this.hslToHex(h, s, l),
      this.hslToHex((h + 60) % 360, s, l),
      this.hslToHex((h + 180) % 360, s, l),
      this.hslToHex((h + 240) % 360, s, l)
    ];
  }

  /**
   * Compute complementary color for a given HSL triple:
   *   complementary = hue rotated by +180°, same s & l.
   *
   * @param {number} h  Hue ∈ [0..360)
   * @param {number} s  Saturation ∈ [0..1]
   * @param {number} l  Lightness ∈ [0..1]
   * @returns {string[]}
   *   Single-element array: [complementHex].
   */
  getComplementary(h, s, l)
  {
    return [this.hslToHex((h + 180) % 360, s, l)];
  }

  /**
   * Compute two analogous colors: hues at (h − 30) and (h + 30).
   *
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Two-element array: [hex at h−30°, hex at h+30°].
   */
  getAnalogous(h, s, l)
  {
    return [this.hslToHex((h - 30 + 360) % 360, s, l), this.hslToHex((h + 30) % 360, s, l)];
  }

  /**
   * Compute two triadic colors: (h + 120°) and (h + 240°).
   *
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Two-element array: [hex at h+120°, hex at h+240°].
   */
  getTriadic(h, s, l)
  {
    return [this.hslToHex((h + 120) % 360, s, l), this.hslToHex((h + 240) % 360, s, l)];
  }

  /**
   * Compute two split-complementary hues: (h + 150°) and (h + 210°).
   *
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Two-element array: [hex at h+150°, hex at h+210°].
   */
  getSplitComplementary(h, s, l)
  {
    return [this.hslToHex((h + 150) % 360, s, l), this.hslToHex((h + 210) % 360, s, l)];
  }

  /**
   * Return a 4-color tetradic scheme, including original hex plus 3 others:
   *   [ baseHex, hue+90°, hue+180°, hue+270° ]
   *
   * @param {string} baseHex
   *   The original color (normalized/validated internally).
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Four-element array, first entry is normalized `baseHex`, next three are computed.
   */
  getTetradic(baseHex, h, s, l)
  {
    return [baseHex, this.hslToHex((h + 90) % 360, s, l), this.hslToHex((h + 180) % 360, s, l), this.hslToHex((h + 270) % 360, s, l)];
  }

  /**
   * Return a four-color “square” scheme: hues at [h, h+90, h+180, h+270].
   *
   * @param {number} h
   * @param {number} s
   * @param {number} l
   * @returns {string[]}
   *   Four-element array of hex strings.
   */
  getSquare(h, s, l)
  {
    return [this.hslToHex(h % 360, s, l), this.hslToHex((h + 90) % 360, s, l), this.hslToHex((h + 180) % 360, s, l), this.hslToHex((h + 270) % 360, s, l)];
  }

  /**
   * Generate five monochromatic shades at lightness levels: [0.1, 0.3, 0.5, 0.7, 0.9].
   * Uses the same `h` and `s`.
   *
   * @param {number} h
   *   Hue ∈ [0..360)
   * @param {number} s
   *   Saturation ∈ [0..1]
   * @returns {string[]}
   *   Five-element array of hex strings, one per lightness level.
   */
  getMonochromatic(h, s)
  {
    return [0.1, 0.3, 0.5, 0.7, 0.9].map(l => this.hslToHex(h, s, l));
  }

  /**
   * Produce three “muted” variants of base color:
   *   1. Lightness = 0.2, Saturation = s×0.5
   *   2. Lightness = 0.4, Saturation = s×0.5
   *   3. Lightness = 0.6, Saturation = s×0.5
   *
   * @param {string} hex
   *   Input hex. Internally: → {r,g,b} → [h,s,l].
   * @returns {string[]}
   *   Three-element array of muted-hex strings.
   */
  getMutedPalette(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    return [0.2, 0.4, 0.6].map(lum => this.hslToHex(h, s * 0.5, lum));
  }

  /**
   * For a base color, generate two accent hues at (h + 45°) and (h + 90°),
   * keeping the same s & l.
   *
   * @param {string} hex
   * @returns {string[]}
   *   Two-element array: [hex at h+45°, hex at h+90°].
   */
  getAccentPalette(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    return [this.hslToHex((h + 45) % 360, s, l), this.hslToHex((h + 90) % 360, s, l)];
  }

  /**
   * Produce a simple linear gradient palette from dark→light, centered on base:
   *   For i=0..count−1:
   *     step = i / (count−1)
   *     newLightness = 0.2 + step * 0.6   (so lightness ∈ [0.2..0.8])
   *     hex_i = hslToHex(h, s, newLightness)
   *
   * @param {string} hex
   * @param {number} [count=5]
   *   Number of steps in gradient. Default: 5.
   * @returns {string[]}
   *   `count` hex strings forming the gradient.
   */
  getGradientStops(hex, count = 5)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    const stops = [];
    for (let i = 0; i < count; i++)
    {
      const step = i / (count - 1);
      stops.push(this.hslToHex(h, s, 0.2 + step * 0.6));
    }
    return stops;
  }

  /**
   * Generate an 11-step “Material” shade ramp at lightness levels:
   *   [0.05, 0.15, 0.25, …, 0.95], using the same h & s.
   *
   * @param {string} hex
   * @returns {string[]}
   *   Eleven-element array of hex strings.
   */
  getMaterialShades(hex)
  {
    const { r, g, b } = this.hexToRgb(hex);
    const [h, s, l] = this.rgbToHsl(r, g, b);
    const levels = [0.05, 0.15, 0.25, 0.35, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.95];
    return levels.map(lvl => this.hslToHex(h, s, lvl));
  }

  /**
   * Return a simplified palette composition:
   * {
   *   primary: [ baseHex ],
   *   secondary: analogousColors,   // [two hexes]
   *   accent: triadicColors        // [two hexes]
   * }
   *
   * @param {string} hex
   * @returns {{ primary: string[], secondary: string[], accent: string[] }}
   */
  getPaletteComposition(hex)
  {
    const palette = this.getColorPalette(hex);
    return {
      primary: palette.primary,
      secondary: palette.analogous,
      accent: palette.triadic
    };
  }

  /**
   * For an array of hex strings, return an array of `getClosestMatch(...)` results:
   *   [{ match, hex, suggested }, …].
   *
   * @param {string[]} colorArray
   *   Array of (possibly invalid) hex strings.
   * @returns {Array<{ match: string, hex: string, suggested: boolean }>}
   */
  checkPalette(colorArray)
  {
    return colorArray.map(hex => this.getClosestMatch(hex));
  }

  /**
   * Given an arbitrary `rawHex`, attempt to normalize it and look up in
   * `this.hexToNameMap`. If found, returns the palette key/name; else returns null.
   *
   * @param {string} rawHex
   *   Any string (3- or 6-digit hex). Normalized internally.
   * @returns {string|null}
   *   The original palette name if exists, otherwise `null`.
   */
  getNameFromHex(rawHex)
  {
    try {
      const key = this.normalizeHex(rawHex);
      return this.hexToNameMap[key] || null;
    }
    catch {
      return null;
    }
  }

  /**
   * Normalize any “#RGB”, “RGB”, or “#RRGGBB” string into lowercase “#rrggbb”.
   * Throws if invalid.
   *
   * @param {string} hex
   *   The user-provided string (e.g., "#F0A", "Ff00Aa", "#0f0f0f").
   * @throws {Error} If `hex` is not a valid 3- or 6-digit hex.
   *
   * @returns {string}
   *   Lowercased, 7-character string: `#rrggbb`.
   */
  normalizeHex(hex)
  {
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) {
      h = h.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(h)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    return `#${h.toLowerCase()}`;
  }

  /**
   * Extract a set of dominant, yet diverse, colors from a canvas.
   * 
   * 1. Count each non‐transparent pixel → normalized "#rrggbb".  
   * 2. Sort colors by frequency descending.  
   * 3. Starting from the most frequent, pick colors one by one—skipping any
   *    that are “too close” (in Lab space) to a previously selected color.
   *
   * @param {HTMLCanvasElement} canvas
   *   The canvas to sample. Must be at least 1×1 pixels.
   * @param {number} [count=5]
   *   Maximum number of colors to return. Defaults to 5.
   * @param {number} [minLabDist=20]
   *   Minimum Euclidean distance in L*a*b* space between any two returned colors.
   *   If a candidate’s Lab‐distance to any already‐chosen color is < minLabDist,
   *   it will be skipped in favor of a “more different” one. Defaults to 20.
   * @returns {string[]}
   *   An array of up to `count` normalized hex strings (e.g. ["#a1b2c3", "#ffee00", …]),
   *   in descending order of frequency, but filtered so that no two are too similar.
   *
   * @example
   * // Given a <canvas id="myCanvas"> with various pixels:
   * const canvas = document.getElementById("myCanvas");
   * // Get 3 diverse dominants (Lab‐distance ≥ 20):
   * const top3 = myColorTheory.extractCanvasColors(canvas, 3, 20);
   * // → ["#112233", "#ffcc00", "#0099ff"]
   */
  extractCanvasColors(canvas, count = 5, minLabDist = 20)
  {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return [];

    // Step 1: read raw RGBA data
    const data = ctx.getImageData(0, 0, width, height).data;
    const freqMap = new Map();

    // Helper: convert (r,g,b) → "#rrggbb"
    const rgbToHex = (r, g, b) =>
    {
      const toHex2 = v =>
      {
        const s = v.toString(16);
        return s.length === 1 ? "0" + s : s;
      };
      return "#" + toHex2(r) + toHex2(g) + toHex2(b);
    };

    // Build frequency map (skip fully transparent pixels)
    for (let i = 0; i < data.length; i += 4)
    {
      const alpha = data[i + 3];
      if (alpha === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const hex = rgbToHex(r, g, b).toLowerCase();

      freqMap.set(hex, (freqMap.get(hex) || 0) + 1);
    }

    if (freqMap.size === 0)
    {
      return [];
    }

    // Step 2: sort colors by frequency descending
    const sorted = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])  // each entry = [hex, count]
      .map(entry => entry[0]);      // extract only the hex strings

    // Step 3: pick up to `count` colors, skipping those too close to ones already picked
    const chosen = [];
    for (const rawHex of sorted)
    {
      // If we've already got enough, stop.
      if (chosen.length >= count) break;

      // Convert candidate → Lab once
      const { r: cr, g: cg, b: cb } = this.hexToRgb(rawHex);
      const labC = this.rgbToLab({ r: cr, g: cg, b: cb });

      // Check distance to each already‐selected color
      let tooClose = false;
      for (const prevHex of chosen)
      {
        const { r: pr, g: pg, b: pb } = this.hexToRgb(prevHex);
        const labP = this.rgbToLab({ r: pr, g: pg, b: pb });

        const dL = labC.L - labP.L;
        const da = labC.a - labP.a;
        const db = labC.b - labP.b;
        const dist = Math.sqrt(dL * dL + da * da + db * db);

        if (dist < minLabDist)
        {
          tooClose = true;
          break;
        }
      }

      if (!tooClose)
      {
        chosen.push(rawHex);
      }
    }

    return chosen;
  }

  /**
   * Determine if a given palette is “light” or “dark” using either WCAG luminance or CIE L*.
   *
   * - If `method === 'lab'`, we normalize L* (0–100) to [0..1] by dividing by 100, then compare to `cutoff`.
   * - Otherwise (default), we compute WCAG relative luminance (already in [0..1]) and compare to `cutoff`.
   * - A majority‐vote among valid colors determines “light” vs. “dark.”
   *
   * @param {string[]} palette
   *   An array of hex strings (3- or 6-digit, with or without `#`). Invalid entries are skipped.
   * @param {number} [cutoff=0.4]
   *   The threshold in [0..1].  
   *   - For WCAG luminance: compare `relativeLuminance(rgb) >= cutoff`.  
   *   - For CIE L*: compare `(lab.L / 100) >= cutoff`.  
   * @param {'wcag'|'lab'} [method='wcag']
   *   Which metric to use:  
   *   - `'wcag'` (default): use `relativeLuminance(rgb)`.  
   *   - `'lab'`: use `rgbToLab(rgb).L / 100`.  
   * @returns {'light' | 'dark'}
   *   - `'light'` if at least half of valid colors meet `value >= cutoff`, otherwise `'dark'`.  
   *   - If no valid colors, returns `'light'` by default.
   *
   * @example
   * // Using WCAG luminance (default cutoff=0.4):
   * isLightPalette(['#ffffff', '#e5e7eb', '#f3f4f5']); // → 'light'
   * isLightPalette(['#444444', '#333333', '#222222']); // → 'dark'
   *
   * @example
   * // Using CIE L* (method = 'lab'), cutoff = 0.6:
   * // '#808080' has L* ≈ 53, so 53/100 = 0.53 < 0.6 → dark.
   * // '#d3d3d3' has L* ≈ 83, so 83/100 = 0.83 ≥ 0.6 → light.
   * isLightPalette(['#808080', '#d3d3d3'], 0.6, 'lab'); // → 'light'
   */
  isLightPalette(palette, cutoff = 0.4, method = 'wcag') {
    let lightCount = 0;
    let darkCount = 0;

    for (const rawHex of palette) {
      let rgb;
      try {
        rgb = this.hexToRgb(rawHex);
      } catch {
        continue; // skip invalid hex
      }

      let value;
      if (method === 'lab') {
        const lab = this.rgbToLab(rgb);
        // Normalize L* (0..100) to [0..1]
        value = lab.L / 100;
      } else {
        // Use WCAG relative luminance ∈ [0..1]
        value = this.relativeLuminance(rgb);
      }

      if (value >= cutoff) {
        lightCount++;
      } else {
        darkCount++;
      }
    }

    // Default to 'light' if no valid colors
    if (lightCount + darkCount === 0) {
      return 'light';
    }

    return lightCount >= darkCount ? 'light' : 'dark';
  }

  /**
   * Create a light/dark theme object from an input palette, and also generate
   * an alternate theme for the opposite mode while keeping primary and secondary the same.
   *
   * - Picks `primary` as the first valid hex in the palette.
   * - Picks `secondary` as the second valid hex, or the complementary of `primary` if none.
   * - Generates two `accents` by hue-shifting `primary`.
   * - Determines `themeType` via `isLightPalette(palette)`.
   *   • If “light”, `background = '#ffffff'`; else `'#000000'`.
   * - Picks `textColor` (black or white) for best contrast against `background`.
   * - Uses `getAlternateBackgrounds(palette)` to get two contrasting backgrounds.
   *   • First entry is used as `alternateBackground`.
   *   • `alternateTextColor` is chosen for that background.
   *
   * @param {string[]} palette
   *   An array of hex strings (3- or 6-digit, with or without `#`). Invalid entries are skipped.
   * @returns {{
   *   themeType: 'light' | 'dark',
   *   background: string,
   *   primary: string,
   *   secondary: string,
   *   accents: string[],
   *   textColor: string,
   *   alternateTheme: {
   *     themeType: 'light' | 'dark',
   *     background: string,
   *     textColor: string
   *   }
   * }}
   *   - `themeType`: 'light' or 'dark', determined by `isLightPalette`.
   *   - `background`: `'#ffffff'` if light, else `'#000000'`.
   *   - `primary`: the first valid hex in `palette`.
   *   - `secondary`: the second valid hex, or complementary of `primary` if none.
   *   - `accents`: two hue-shifted variants of `primary` (via `getAccentPalette`).
   *   - `textColor`: 'black' or 'white' for best contrast on `background`.
   *   - `alternateTheme`: object for the opposite mode:
   *       • `themeType`: opposite of main themeType.
   *       • `background`: from `getAlternateBackgrounds(palette)[0]`.
   *       • `textColor`: 'black' or 'white' for best contrast on that background.
   *
   * @throws {Error}
   *   If there are no valid hex colors in `palette`.
   *
   * @example
   * createThemeFromPalette(['#ff0000', '#00ff00', '#0000ff']);
   * // → {
   * //      themeType: 'light',
   * //      background: '#ffffff',
   * //      primary: '#ff0000',
   * //      secondary: '#00ff00',
   * //      accents: ['#ff007f','#ff00ff'],
   * //      textColor: 'black',
   * //      alternateTheme: {
   * //        themeType: 'dark',
   * //        background: '#06040a',
   * //        textColor: 'white'
   * //      }
   * //    }
   */
  createThemeFromPalette(palette) {
    // 1) Normalize and filter out invalid hexes
    const validColors = [];
    for (const rawHex of palette) {
      try {
        validColors.push(this.normalizeHex(rawHex));
      } catch {
        // skip invalid
      }
    }
    if (validColors.length === 0) {
      throw new Error('createThemeFromPalette: no valid hex colors provided');
    }

    // 2) Determine primary and secondary
    const primary = validColors[0];
    let secondary;
    if (validColors.length >= 2) {
      secondary = validColors[1];
    } else {
      // Compute complementary of primary
      const { r, g, b } = this.hexToRgb(primary);
      const [h, s, l] = this.rgbToHsl(r, g, b);
      const [compHex] = this.getComplementary(h, s, l);
      secondary = this.normalizeHex(compHex);
    }

    // 3) Generate accents (two hue shifts)
    let accents = [];
    try {
      accents = this.getAccentPalette(primary).map(hex => this.normalizeHex(hex));
    } catch {
      accents = [];
    }

    // 4) Determine main theme type based on palette
    const themeType = this.isLightPalette(validColors);

    // 5) Set main background accordingly
    const background = themeType === 'light' ? '#ffffff' : '#000000';

    // 6) Choose main text color for contrast on background
    const textColor = this.getContrastColor(background);

    // 7) Compute alternate backgrounds (two options) that contrast primary
    let alternateBackgrounds;
    try {
      alternateBackgrounds = this.getAlternateBackgrounds(validColors);
    } catch {
      throw new Error('createThemeFromPalette: failed to compute alternate backgrounds');
    }
    // Use the first alternate background for the opposite theme
    const altBg = alternateBackgrounds[0];

    // 8) Determine alternate themeType (flip main)
    const alternateThemeType = themeType === 'light' ? 'dark' : 'light';

    // 9) Choose alternate text color for that background
    const alternateTextColor = this.getContrastColor(altBg);

    return {
      themeType,
      background,
      primary,
      secondary,
      accents,
      textColor,
      alternateTheme: {
        themeType: alternateThemeType,
        background: altBg,
        textColor: alternateTextColor
      }
    };
  }

  /**
   * Given a palette, generate two alternate background colors that contrast
   * with the primary color’s theme (light or dark), using Material‐style shade ramps.
   *
   * - First, normalize and filter valid hexes from `palette`.
   * - Determine `primary` as the first valid hex.
   * - Compute `shades = getMaterialShades(primary)` → array of 11 hexes (L* from 5%→95%).
   * - Use `isLightPalette(palette)` to decide if the theme is light or dark:
   *   • If theme is “light”:
   *       • Pick two darkest material shades: `shades[0]` (L≈5%) and `shades[1]` (L≈15%).
   *       • These provide deep‐dark backgrounds contrasting a light theme.
   *   • If theme is “dark”:
   *       • Pick two lightest material shades: `shades[10]` (L≈95%) and `shades[9]` (L≈85%).
   *       • These provide bright backgrounds contrasting a dark theme.
   * - Return an array of those two hex strings.
   *
   * @param {string[]} palette
   *   Array of hex strings (3‐ or 6‐digit, with or without `#`). Invalid entries are skipped.
   * @returns {string[]}
   *   Two normalized hex strings to use as alternate contrasting backgrounds.
   *
   * @throws {Error}
   *   If no valid hex colors are provided.
   *
   * @example
   * // For a light palette (pastels), pick dark backgrounds:
   * getAlternateBackgrounds(['#f0f8ff', '#ffb6c1', '#e6e6fa']);
   * // → ['#06040a', '#171029']  (darkest Material shades of primary)
   *
   * @example
   * // For a dark palette, pick light backgrounds:
   * getAlternateBackgrounds(['#001f3f', '#002966']);
   * // → ['#f2f2f2', '#d9d9d9']  (lightest Material shades of primary)
   */
  getAlternateBackgrounds(palette) {
    // 1) Normalize and collect valid hexes
    const valid = [];
    for (const raw of palette) {
      try {
        valid.push(this.normalizeHex(raw));
      } catch {
        // skip invalid
      }
    }
    if (valid.length === 0) {
      throw new Error('getAlternateBackgrounds: no valid hex colors provided');
    }

    // 2) Choose primary
    const primary = valid[0];

    // 3) Compute Material shades [L≈5%,15%,25%,...,95%]
    let shades = [];
    try {
      shades = this.getMaterialShades(primary).map(h => this.normalizeHex(h));
    } catch {
      throw new Error('getAlternateBackgrounds: failed to generate Material shades');
    }
    // shades[0] = darkest (L≈5%), shades[10] = lightest (L≈95%)

    // 4) Determine theme type
    const themeType = this.isLightPalette(valid);

    // 5) Pick two backgrounds
    let altBackgrounds;
    if (themeType === 'light') {
      // For a light theme, choose the two darkest shades
      altBackgrounds = [shades[0], shades[1]];
    } else {
      // For a dark theme, choose the two lightest shades
      altBackgrounds = [shades[10], shades[9]];
    }

    return altBackgrounds;
  }

}