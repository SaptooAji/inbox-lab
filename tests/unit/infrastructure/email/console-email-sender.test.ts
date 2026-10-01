import { describe, expect, it } from "vitest";
import { ConsoleEmailSender } from "@/infrastructure/email/console-email-sender";
import { unwrap } from "../../support/unwrap";

const email = { to: "rina@example.com", subject: "Hello", html: "<p>x</p>", text: "Plain body" };

describe("ConsoleEmailSender", () => {
  it("prints the message instead of sending it", async () => {
    const printed: string[] = [];
    const sender = new ConsoleEmailSender((text) => printed.push(text));

    const receipt = unwrap(await sender.send(email));

    expect(receipt.providerMessageId).toBe("console-1");
    expect(printed).toHaveLength(1);
    expect(printed[0]).toContain("To: rina@example.com");
    expect(printed[0]).toContain("Subject: Hello");
    expect(printed[0]).toContain("Plain body");
  });

  it("numbers each message", async () => {
    const sender = new ConsoleEmailSender(() => undefined);
    await sender.send(email);

    expect(unwrap(await sender.send(email)).providerMessageId).toBe("console-2");
  });
});
