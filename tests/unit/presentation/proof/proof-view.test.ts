import { describe, expect, it } from "vitest";
import type { ProofEntry } from "@/application/dto/proof.dto";
import { proofCaption, proofSummary, sourceLabel } from "@/presentation/proof/proof-view";

function makeEntry(overrides: Partial<ProofEntry> = {}): ProofEntry {
  return {
    id: "gmail-web-welcome-light",
    templateId: "welcome",
    client: "Gmail web",
    tool: "Chrome on Windows",
    scheme: "light",
    date: "2026-10-02",
    source: "real",
    image: "gmail-web-welcome-light.png",
    alt: "The welcome email opened in Gmail on the web, light theme",
    width: 1200,
    height: 1600,
    ...overrides,
  };
}

describe("sourceLabel", () => {
  it("says plainly whether a screenshot is real or simulated", () => {
    expect(sourceLabel("real")).toBe("Real client render");
    expect(sourceLabel("simulated")).toBe("Simulation");
  });
});

describe("proofCaption", () => {
  it("names the client, the tool or device, the theme and the date", () => {
    expect(proofCaption(makeEntry())).toBe(
      "Gmail web, Chrome on Windows, light theme, 2 October 2026",
    );
  });

  it("does not pad the day and spells the month in English", () => {
    expect(proofCaption(makeEntry({ date: "2026-01-05", scheme: "dark" }))).toBe(
      "Gmail web, Chrome on Windows, dark theme, 5 January 2026",
    );
  });
});

describe("proofSummary", () => {
  it("handles an empty list", () => {
    expect(proofSummary([])).toBe("No screenshots yet.");
  });

  it("uses the singular for one screenshot and leaves out the zero part", () => {
    expect(proofSummary([makeEntry()])).toBe("1 screenshot: 1 real client render");
  });

  it("counts real renders and simulations separately", () => {
    const entries = [
      makeEntry({ id: "a" }),
      makeEntry({ id: "b" }),
      makeEntry({ id: "c", source: "simulated" }),
    ];

    expect(proofSummary(entries)).toBe("3 screenshots: 2 real client renders, 1 simulation");
  });

  it("uses the plural for simulations", () => {
    const entries = [
      makeEntry({ id: "a", source: "simulated" }),
      makeEntry({ id: "b", source: "simulated" }),
    ];

    expect(proofSummary(entries)).toBe("2 screenshots: 2 simulations");
  });
});
