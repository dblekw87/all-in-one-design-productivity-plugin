import type { NormalizedColor, NormalizedLength, NormalizedNumber, ParsedCssValue } from "@aio/page-model";

export function parseLength(rawValue: string | undefined): ParsedCssValue<NormalizedLength> {
  const raw = rawValue?.trim() ?? "";
  if (!raw) return { raw, parsed: false };
  const lower = raw.toLowerCase();
  if (lower === "auto") return { raw, parsed: true, value: { type: "AUTO" } };
  if (lower === "none") return { raw, parsed: true, value: { type: "NONE" } };
  if (lower === "normal") return { raw, parsed: true, value: { type: "NORMAL" } };
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(px|%|em|rem|vw|vh)?$/i.exec(raw);
  if (match) {
    const value = Number(match[1]);
    const unit = (match[2] ?? "px").toLowerCase();
    const types: Record<string, "PX" | "PERCENT" | "EM" | "REM" | "VW" | "VH"> = { px: "PX", "%": "PERCENT", em: "EM", rem: "REM", vw: "VW", vh: "VH" };
    const type = types[unit];
    if (type && Number.isFinite(value)) return { raw, parsed: true, value: { type, value } };
    return { raw, parsed: false, value: { type: "UNPARSED", raw } };
  }
  if (/^(?:min-content|max-content|fit-content(?:\(.+\))?)$/i.test(raw)) return { raw, parsed: true, value: { type: "KEYWORD", value: raw } };
  return { raw, parsed: false, value: { type: "UNPARSED", raw } };
}

export function parseNumber(rawValue: string | undefined): ParsedCssValue<NormalizedNumber> {
  const raw = rawValue?.trim() ?? "";
  if (!raw) return { raw, parsed: false };
  const value = Number(raw);
  if (Number.isFinite(value) && raw !== "auto" && raw !== "normal") return { raw, parsed: true, value };
  if (raw === "auto" || raw === "normal" || raw === "none") return { raw, parsed: true, value: { type: "KEYWORD", value: raw } };
  return { raw, parsed: false, value: { type: "KEYWORD", value: raw } };
}

export function parseColor(rawValue: string | undefined): ParsedCssValue<NormalizedColor> {
  const raw = rawValue?.trim() ?? "";
  if (!raw) return { raw, parsed: false };
  if (raw.toLowerCase() === "transparent" || raw.toLowerCase() === "rgba(0, 0, 0, 0)") return { raw, parsed: true, value: { type: "TRANSPARENT", raw } };
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(raw);
  if (rgb) {
    const alphaRaw = rgb[4] ?? "1";
    const alpha = Number(alphaRaw.replace("%", "")) / (alphaRaw.includes("%") ? 100 : 1);
    const red = Number(rgb[1] ?? "NaN"); const green = Number(rgb[2] ?? "NaN"); const blue = Number(rgb[3] ?? "NaN");
    if ([red, green, blue, alpha].every(Number.isFinite) && red >= 0 && red <= 255 && green >= 0 && green <= 255 && blue >= 0 && blue <= 255 && alpha >= 0 && alpha <= 1) return { raw, parsed: true, value: { type: "RGBA", r: red, g: green, b: blue, a: alpha, raw } };
  }
  const hex = /^#([\da-f]{6}|[\da-f]{8})$/i.exec(raw);
  if (hex) {
    const value = hex[1] ?? "";
    const channels = [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16), value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1] as const;
    return { raw, parsed: true, value: { type: "RGBA", r: channels[0], g: channels[1], b: channels[2], a: channels[3], raw } };
  }
  return { raw, parsed: false, value: { type: "UNPARSED", raw } };
}

export function rawValue(styles: Record<string, string>, key: string): string | undefined { return styles[key]; }
