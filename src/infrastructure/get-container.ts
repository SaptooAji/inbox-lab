import { join } from "node:path";
import { parseConfig } from "./config/config";
import { createContainer, type Container } from "./container";
import { SystemClock } from "./time/system-clock";

let instance: Container | undefined;

/** Built on first use, never at import time, so `next build` does not need runtime secrets. */
export function getContainer(): Container {
  instance ??= createContainer(parseConfig(process.env), {
    buildOutputDirectory: join(process.cwd(), "dist", "emails"),
    clock: new SystemClock(),
    write: (line) => console.log(line),
  });
  return instance;
}
