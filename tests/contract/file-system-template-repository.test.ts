import { FileSystemTemplateRepository } from "@/infrastructure/templates/file-system-template-repository";
import { createBuildOutputFixture } from "../unit/support/build-output";
import { describeTemplateRepositoryContract } from "./template-repository.contract";

describeTemplateRepositoryContract("FileSystemTemplateRepository", (templates) => {
  const fixture = createBuildOutputFixture(templates);
  return {
    repository: new FileSystemTemplateRepository(fixture.directory),
    dispose: fixture.dispose,
  };
});
