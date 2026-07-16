import { describe, expect, it } from "vitest";
import {
  carbFueling,
  nutritionPlan,
  proteinTarget,
  shiftFuelTips,
  trainingFuelTips,
} from "./nutrition";

describe("proteinTarget", () => {
  it("skaliert 1,6–2,2 g/kg und rundet auf 5 g", () => {
    const p = proteinTarget(80);
    expect(p.minG).toBe(130); // 1.6*80=128 -> 130
    expect(p.maxG).toBe(175); // 2.2*80=176 -> 175
    expect(p.perMealG).toBe(28); // 0.35*80
    expect(p.meals).toBe(4);
  });

  it("liefert für andere Gewichte plausible Werte", () => {
    const p = proteinTarget(60);
    expect(p.minG).toBe(95); // 96 -> 95
    expect(p.maxG).toBe(130); // 132 -> 130
    expect(p.perMealG).toBe(21);
  });
});

describe("carbFueling", () => {
  it("gibt null für kurze Läufe (<90 min)", () => {
    expect(carbFueling("easy", 5)).toBeNull();
    expect(carbFueling("run", 8)).toBeNull(); // ~56 min
  });

  it("gibt null für Nicht-Lauf-Einheiten", () => {
    expect(carbFueling("gym")).toBeNull();
    expect(carbFueling("mobility")).toBeNull();
    expect(carbFueling("rest")).toBeNull();
  });

  it("berechnet 60–90 g/h für lange Einheiten", () => {
    const c = carbFueling("longrun", null, 120); // 2 h
    expect(c).not.toBeNull();
    expect(c?.perHourMinG).toBe(60);
    expect(c?.perHourMaxG).toBe(90);
    expect(c?.totalMinG).toBe(120); // 60*2
    expect(c?.totalMaxG).toBe(180); // 90*2
  });

  it("schätzt Dauer aus km, wenn keine Minuten gegeben sind", () => {
    // 20 km * 7 min = 140 min -> fueling nötig
    const c = carbFueling("longrun", 20);
    expect(c?.durationMin).toBe(140);
  });
});

describe("shiftFuelTips", () => {
  it("legt die Hauptmahlzeit vor die erste Nachtschicht", () => {
    const tips = shiftFuelTips("night", { firstNight: true }).join(" ");
    expect(tips).toMatch(/VOR die Schicht/);
    expect(tips).toMatch(/Vorschlaf/);
  });

  it("warnt bei Folgenacht vor großer Mahlzeit vor dem Tagschlaf", () => {
    const tips = shiftFuelTips("night", { firstNight: false }).join(" ");
    expect(tips).toMatch(/Tagschlaf/);
  });

  it("hat für jede Schichtart Tipps", () => {
    for (const s of ["day", "night", "sleep", "free", "v"] as const) {
      expect(shiftFuelTips(s).length).toBeGreaterThan(0);
    }
  });
});

describe("trainingFuelTips", () => {
  it("nennt beim Long Run KH/h und Darm-Training", () => {
    const c = carbFueling("longrun", null, 120);
    const tips = trainingFuelTips("longrun", c, proteinTarget(80)).join(" ");
    expect(tips).toMatch(/g KH\/h/);
    expect(tips).toMatch(/Darm/);
    expect(tips).toMatch(/28 g Protein/);
  });

  it("gibt am Ruhetag einen Periodisierungs-Hinweis", () => {
    const tips = trainingFuelTips("rest", null).join(" ");
    expect(tips).toMatch(/periodisieren|zurückfahren/i);
  });
});

describe("nutritionPlan", () => {
  it("personalisiert die Headline mit Proteinspanne, wenn Gewicht bekannt", () => {
    const plan = nutritionPlan({
      shift: "free",
      kind: "longrun",
      targetMin: 120,
      weightKg: 80,
    });
    expect(plan.headline).toMatch(/130–175 g Protein/);
    expect(plan.protein?.minG).toBe(130);
    expect(plan.carbs).toBeDefined();
    expect(plan.trainingTips.length).toBeGreaterThan(0);
    expect(plan.shiftTips.length).toBeGreaterThan(0);
  });

  it("funktioniert ohne Gewicht (keine Protein-Personalisierung)", () => {
    const plan = nutritionPlan({ shift: "day", kind: "easy" });
    expect(plan.protein).toBeUndefined();
    expect(plan.headline).not.toMatch(/g Protein/);
    expect(plan.trainingTips.length).toBeGreaterThan(0);
  });

  it("gibt ohne Einheit einen Ruhe-Hinweis statt Trainingsfuel", () => {
    const plan = nutritionPlan({ shift: "sleep", weightKg: 75 });
    expect(plan.carbs).toBeUndefined();
    expect(plan.trainingTips.join(" ")).toMatch(/Keine Einheit/);
  });
});
