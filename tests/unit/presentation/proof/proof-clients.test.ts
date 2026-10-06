import { describe, expect, it } from "vitest";
import type { ProofEntry } from "@/application/dto/proof.dto";
import { groupProofByClient } from "@/presentation/proof/proof-view";

function makeEntry(overrides: Partial<ProofEntry> = {}): ProofEntry {
  return {
    id: "gmail-web-welcome-light",
    templateId: "welcome",
    client: "Gmail web",
    tool: "Chrome on Windows",
    scheme: "light",
    date: "2026-10-05",
    source: "real",
    image: "gmail-web-welcome-light.png",
    alt: "The welcome email in Gmail on the web, light theme",
    width: 740,
    height: 2048,
    ...overrides,
  };
}

describe("groupProofByClient", () => {
  it("returns nothing for an empty list", () => {
    expect(groupProofByClient([])).toEqual([]);
  });

  it("pairs the light and dark screenshot of one client", () => {
    const light = makeEntry({ id: "a-light", scheme: "light" });
    const dark = makeEntry({ id: "a-dark", scheme: "dark" });

    expect(groupProofByClient([dark, light])).toEqual([
      { templateId: "welcome", clients: [{ client: "Gmail web", light, dark }] },
    ]);
  });

  it("leaves the missing theme undefined when a client has only one", () => {
    const light = makeEntry({ id: "o-light", client: "Outlook.com web", scheme: "light" });

    expect(groupProofByClient([light])).toEqual([
      {
        templateId: "welcome",
        clients: [{ client: "Outlook.com web", light, dark: undefined }],
      },
    ]);
  });

  it("sorts the clients of a template by name", () => {
    const outlook = makeEntry({ id: "o", client: "Outlook.com web" });
    const android = makeEntry({ id: "a", client: "Gmail app (Android)" });
    const web = makeEntry({ id: "w", client: "Gmail web" });

    const [group] = groupProofByClient([outlook, web, android]);

    expect(group?.clients.map((item) => item.client)).toEqual([
      "Gmail app (Android)",
      "Gmail web",
      "Outlook.com web",
    ]);
  });

  it("keeps the first entry when a theme appears twice, because the list is newest first", () => {
    const newer = makeEntry({ id: "newer", date: "2026-10-06" });
    const older = makeEntry({ id: "older", date: "2026-10-05" });

    const [group] = groupProofByClient([newer, older]);

    expect(group?.clients[0]?.light).toBe(newer);
  });

  it("orders templates like the template list and leaves out templates without proof", () => {
    const winBack = makeEntry({ id: "b", templateId: "win-back" });
    const welcome = makeEntry({ id: "a", templateId: "welcome" });

    expect(groupProofByClient([winBack, welcome]).map((group) => group.templateId)).toEqual([
      "welcome",
      "win-back",
    ]);
  });
});
