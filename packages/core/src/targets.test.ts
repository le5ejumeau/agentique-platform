import { describe, expect, it } from "vitest";
import { describeTargets, parseTargets } from "./domain";

describe("parseTargets", () => {
  it("accepte plusieurs cibles et les remet dans l'ordre", () => {
    expect(parseTargets(["android", "web", "ios"])).toEqual(["web", "ios", "android"]);
  });

  it("refuse une liste vide, une cible inconnue ou un doublon", () => {
    expect(parseTargets([])).toBeNull();
    expect(parseTargets(["web", "windows"])).toBeNull();
    expect(parseTargets(["ios", "ios"])).toBeNull();
    expect(parseTargets("web")).toBeNull();
  });
});

describe("describeTargets", () => {
  it("décrit les cibles en français", () => {
    expect(describeTargets(["web"])).toBe("web");
    expect(describeTargets(["ios"])).toBe("mobile iOS");
    expect(describeTargets(["web", "ios", "android"])).toBe("mobile iOS et Android, et web");
  });
});
