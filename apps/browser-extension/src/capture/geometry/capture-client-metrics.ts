export interface CapturedClientMetrics {
  clientWidth: number;
  clientHeight: number;
  offsetWidth: number;
  offsetHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  scrollLeft: number;
  scrollTop: number;
}

export function captureClientMetrics(element: Element): CapturedClientMetrics {
  const htmlElement = element as HTMLElement;
  return {
    clientWidth: htmlElement.clientWidth ?? 0,
    clientHeight: htmlElement.clientHeight ?? 0,
    offsetWidth: htmlElement.offsetWidth ?? 0,
    offsetHeight: htmlElement.offsetHeight ?? 0,
    scrollWidth: htmlElement.scrollWidth ?? 0,
    scrollHeight: htmlElement.scrollHeight ?? 0,
    scrollLeft: htmlElement.scrollLeft ?? 0,
    scrollTop: htmlElement.scrollTop ?? 0
  };
}
