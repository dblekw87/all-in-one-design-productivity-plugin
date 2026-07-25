type PageFunction = (...args: never[]) => unknown;

/** Removes bundler-only function-name helpers before source is evaluated in the page. */
export function serializePageFunction(fn: PageFunction): string {
  return fn.toString().replace(/\b__name\([^;]*\);\s*/g, "");
}
