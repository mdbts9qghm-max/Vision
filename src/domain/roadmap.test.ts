import { describe, expect, it } from "vitest";
import { MILESTONES, roadToUltra } from "./roadmap";

describe("roadToUltra", () => {
  it("Einsteiger ohne langen Lauf: nichts erreicht, nächster ist 5 km", () => {
    const r = roadToUltra(0);
    expect(r.reachedCount).toBe(0);
    expect(r.next?.km).toBe(5);
    expect(r.kmToNext).toBe(5);
    expect(r.progress).toBe(0);
    expect(r.milestones[0].isNext).toBe(true);
  });

  it("markiert erreichte Meilenstein-Etappen bis zur längsten Strecke", () => {
    const r = roadToUltra(12);
    expect(r.milestones.find((m) => m.km === 10)?.reached).toBe(true);
    expect(r.milestones.find((m) => m.km === 5)?.reached).toBe(true);
    expect(r.milestones.find((m) => m.km === 21.1)?.reached).toBe(false);
    expect(r.next?.label).toBe("Halbmarathon");
    expect(r.kmToNext).toBe(9.1); // 21.1 - 12
    expect(r.reachedCount).toBe(2);
  });

  it("berechnet Fortschritt an der 100-km-Marke", () => {
    expect(roadToUltra(42.2).progress).toBeCloseTo(0.422, 5);
    expect(roadToUltra(50).progress).toBe(0.5);
  });

  it("Ziel erreicht: alles reached, kein next", () => {
    const r = roadToUltra(105);
    expect(r.reachedCount).toBe(MILESTONES.length);
    expect(r.next).toBeNull();
    expect(r.kmToNext).toBe(0);
    expect(r.progress).toBe(1); // gedeckelt
  });

  it("rundet Werte sauber und behandelt Negatives als 0", () => {
    const r = roadToUltra(-3);
    expect(r.longestRunKm).toBe(0);
    expect(r.reachedCount).toBe(0);
  });
});
