import { join } from "node:path";
import { createTemplateServices, type TemplateServices } from "./template-services";

let instance: TemplateServices | undefined;

export function getTemplateServices(): TemplateServices {
  instance ??= createTemplateServices(join(process.cwd(), "dist", "emails"));
  return instance;
}
