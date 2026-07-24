export interface FixtureManifest {
  id: "fixture-basic-landing-v1";
  version: "1.0";
  route: "/fixtures/basic-landing-v1";
  expected: {
    sections: number;
    featureCards: number;
    images: number;
    inlineSvg: number;
    hiddenElements: number;
    ariaHiddenElements: number;
    pseudoElementSelectors: number;
  };
}

export const basicLandingV1Manifest: FixtureManifest = {
  id: "fixture-basic-landing-v1",
  version: "1.0",
  route: "/fixtures/basic-landing-v1",
  expected: {
    sections: 3,
    featureCards: 3,
    images: 1,
    inlineSvg: 1,
    hiddenElements: 1,
    ariaHiddenElements: 1,
    pseudoElementSelectors: 1
  }
};
