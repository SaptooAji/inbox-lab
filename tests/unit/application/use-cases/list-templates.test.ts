import { describe, expect, it } from "vitest";
import { ListTemplates } from "@/application/use-cases/list-templates";
import { aTemplate, FakeTemplateRepository } from "../../support/fakes";

describe("ListTemplates", () => {
  it("returns a summary per template in repository order, without email bodies", async () => {
    const useCase = new ListTemplates(
      new FakeTemplateRepository([aTemplate("welcome"), aTemplate("win-back")]),
    );

    expect(await useCase.execute()).toEqual([
      {
        id: "welcome",
        name: "welcome",
        description: "Template welcome",
        defaultSubject: "Default subject for welcome",
      },
      {
        id: "win-back",
        name: "win-back",
        description: "Template win-back",
        defaultSubject: "Default subject for win-back",
      },
    ]);
  });

  it("returns an empty list when there are no templates", async () => {
    const useCase = new ListTemplates(new FakeTemplateRepository([]));

    expect(await useCase.execute()).toEqual([]);
  });
});
