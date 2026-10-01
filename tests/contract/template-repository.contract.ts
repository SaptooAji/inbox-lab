import { afterEach, describe, expect, it } from "vitest";
import type { TemplateRepository } from "@/application/ports/template-repository";
import type { EmailTemplate } from "@/domain/entities/email-template";
import { TemplateId } from "@/domain/value-objects/template-id";
import { aTemplate } from "../unit/support/fakes";
import { unwrap } from "../unit/support/unwrap";

export interface RepositoryHarness {
  readonly repository: TemplateRepository;
  dispose(): void;
}

export type HarnessFactory = (templates: readonly EmailTemplate[]) => RepositoryHarness;

/** Every TemplateRepository implementation must pass this suite. */
export function describeTemplateRepositoryContract(
  name: string,
  createHarness: HarnessFactory,
): void {
  describe(`${name} honours the TemplateRepository contract`, () => {
    const open: RepositoryHarness[] = [];

    afterEach(() => {
      for (const harness of open.splice(0)) {
        harness.dispose();
      }
    });

    function repositoryWith(templates: readonly EmailTemplate[]): TemplateRepository {
      const harness = createHarness(templates);
      open.push(harness);
      return harness.repository;
    }

    it("lists every template it holds", async () => {
      const repository = repositoryWith([aTemplate("welcome"), aTemplate("win-back")]);

      const ids = (await repository.list()).map((template) => template.id.value);

      expect([...ids].sort()).toEqual(["welcome", "win-back"]);
    });

    it("lists nothing when it holds nothing", async () => {
      expect(await repositoryWith([]).list()).toEqual([]);
    });

    it("finds a template by id with all of its content", async () => {
      const original = aTemplate("welcome");
      const repository = repositoryWith([original, aTemplate("win-back")]);

      const found = await repository.findById(unwrap(TemplateId.create("welcome")));

      expect(found).not.toBeNull();
      expect(found?.name).toBe(original.name);
      expect(found?.description).toBe(original.description);
      expect(found?.defaultSubject.value).toBe(original.defaultSubject.value);
      expect(found?.html).toBe(original.html);
      expect(found?.darkHtml).toBe(original.darkHtml);
      expect(found?.text).toBe(original.text);
    });

    it("returns null for an id it does not hold", async () => {
      const repository = repositoryWith([aTemplate("welcome")]);

      expect(await repository.findById(unwrap(TemplateId.create("win-back")))).toBeNull();
    });
  });
}
