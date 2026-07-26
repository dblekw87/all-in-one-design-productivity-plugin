export interface InlineSvgSafety {
  hasScript: boolean;
  hasForeignObject: boolean;
  hasEventHandler: boolean;
  hasExternalReference: boolean;
  hasJavascriptUrl: boolean;
  hasDoctypeOrEntity: boolean;
  unsafe: boolean;
}

export function inspectInlineSvgSafety(svgSource: string): InlineSvgSafety {
  const lower = svgSource.toLowerCase();
  const hasEventHandler = /\son[a-z]+\s*=/.test(lower);
  const hasExternalReference = /\s(?:href|xlink:href)\s*=\s*["']https?:\/\//.test(lower);
  const hasJavascriptUrl = /javascript:/i.test(svgSource);
  const hasDoctypeOrEntity = /<!doctype|<!entity/i.test(svgSource);
  return {
    hasScript: lower.includes("<script"),
    hasForeignObject: lower.includes("<foreignobject"),
    hasEventHandler,
    hasExternalReference,
    hasJavascriptUrl,
    hasDoctypeOrEntity,
    unsafe: lower.includes("<script") || lower.includes("<foreignobject") || hasEventHandler || hasExternalReference || hasJavascriptUrl || hasDoctypeOrEntity
  };
}
