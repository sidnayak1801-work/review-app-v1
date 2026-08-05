import { describe, expect, it } from "vitest";

import { areaFromLinePath, catmullRomPath } from "./smooth-path";

describe("catmullRomPath", () => {
  it("returns empty for no points", () => {
    expect(catmullRomPath([])).toBe("");
  });

  it("uses a straight segment for two points", () => {
    expect(catmullRomPath([{ x: 0, y: 10 }, { x: 20, y: 30 }])).toBe(
      "M 0.00 10.00 L 20.00 30.00",
    );
  });

  it("emits cubic curves for three or more points", () => {
    const path = catmullRomPath([
      { x: 0, y: 50 },
      { x: 50, y: 10 },
      { x: 100, y: 40 },
    ]);
    expect(path.startsWith("M 0.00 50.00")).toBe(true);
    expect(path).toContain(" C ");
  });
});

describe("areaFromLinePath", () => {
  it("closes the path to a baseline", () => {
    const points = [
      { x: 0, y: 10 },
      { x: 20, y: 5 },
    ];
    const line = catmullRomPath(points);
    const area = areaFromLinePath(line, points, 100);
    expect(area.endsWith("Z")).toBe(true);
    expect(area).toContain("100.00");
  });
});
