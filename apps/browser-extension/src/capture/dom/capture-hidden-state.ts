export interface BrowserHiddenState {
  displayNone: boolean;
  visibilityHidden: boolean;
  opacityZero: boolean;
  hiddenAttribute: boolean;
  ariaHidden: boolean;
  zeroSize: boolean;
  contentVisibilityHidden: boolean;
  intersectsViewport: boolean;
  hidden: boolean;
}

export function captureHiddenState(element: Element, style: CSSStyleDeclaration, rect: DOMRect): BrowserHiddenState {
  const displayNone = style.display === "none";
  const visibilityHidden = style.visibility === "hidden" || style.visibility === "collapse";
  const opacityZero = Number(style.opacity) === 0;
  const hiddenAttribute = element.hasAttribute("hidden");
  const ariaHidden = element.getAttribute("aria-hidden") === "true";
  const zeroSize = rect.width === 0 || rect.height === 0;
  const contentVisibilityHidden = style.contentVisibility === "hidden";
  const intersectsViewport = rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
  return {
    displayNone,
    visibilityHidden,
    opacityZero,
    hiddenAttribute,
    ariaHidden,
    zeroSize,
    contentVisibilityHidden,
    intersectsViewport,
    hidden: displayNone || visibilityHidden || hiddenAttribute || contentVisibilityHidden
  };
}
