import { describe, expect, it } from "vitest";
import { ComposeStep, type ComponentLoader } from "../../../../emails/build/steps/compose-step";

function loaderFor(components: Record<string, string>): ComponentLoader {
  const map = new Map(Object.entries(components));
  return { load: (name) => map.get(name) ?? null };
}

async function compose(components: Record<string, string>, html: string): Promise<string> {
  const result = await new ComposeStep(loaderFor(components)).run({ name: "welcome", html });
  return result.html;
}

describe("ComposeStep", () => {
  it("replaces an include with the component markup", async () => {
    const html = await compose({ header: "<h1>Hi</h1>" }, "<body><!--@include header--></body>");

    expect(html).toBe("<body><h1>Hi</h1></body>");
  });

  it("leaves ordinary comments and plain markup untouched", async () => {
    const source = "<!-- keep me --><p>text</p>";

    expect(await compose({}, source)).toBe(source);
  });

  it("passes parameters into [[name]] placeholders", async () => {
    const html = await compose(
      { button: '<a href="[[href]]">[[label]]</a>' },
      '<!--@include button href="https://x.test" label="Open"-->',
    );

    expect(html).toBe('<a href="https://x.test">Open</a>');
  });

  it("supports the same component twice with different parameters", async () => {
    const html = await compose(
      { tag: "<i>[[v]]</i>" },
      '<!--@include tag v="one"--><!--@include tag v="two"-->',
    );

    expect(html).toBe("<i>one</i><i>two</i>");
  });

  it("resolves nested includes and passes parameters through", async () => {
    const html = await compose(
      {
        cta: '<p><!--@include button href="[[url]]" label="[[text]]"--></p>',
        button: '<a href="[[href]]">[[label]]</a>',
      },
      '<!--@include cta url="https://a.test" text="Go"-->',
    );

    expect(html).toBe('<p><a href="https://a.test">Go</a></p>');
  });

  it("inserts parameter values literally, without replacement patterns", async () => {
    const html = await compose({ b: "<b>[[label]]</b>" }, '<!--@include b label="$&"-->');

    expect(html).toBe("<b>$&</b>");
  });

  it("leaves missing parameters for the placeholder guard", async () => {
    const html = await compose({ b: "<b>[[label]]</b>" }, "<!--@include b-->");

    expect(html).toBe("<b>[[label]]</b>");
  });

  it("fails on an unknown component", async () => {
    await expect(compose({}, "<!--@include ghost-->")).rejects.toThrow('Unknown component "ghost"');
  });

  it("fails on circular includes and shows the cycle", async () => {
    await expect(
      compose({ a: "<!--@include b-->", b: "<!--@include a-->" }, "<!--@include a-->"),
    ).rejects.toThrow("Circular include: a -> b -> a");
  });
});
