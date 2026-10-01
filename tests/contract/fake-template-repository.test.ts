import { FakeTemplateRepository } from "../unit/support/fakes";
import { describeTemplateRepositoryContract } from "./template-repository.contract";

describeTemplateRepositoryContract("FakeTemplateRepository", (templates) => ({
  repository: new FakeTemplateRepository(templates),
  dispose: () => undefined,
}));
