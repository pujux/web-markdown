import { describe, expect, it } from "vitest";

import type { HtmlToMarkdownConverter } from "@web-markdown/core";

import { toTransformFetchOptions } from "../src/options";

const converter: HtmlToMarkdownConverter = {
  convert: (html) => html,
};

describe("toTransformFetchOptions", () => {
  it("copies transform options with only defined fields", () => {
    const options = toTransformFetchOptions({
      converter,
      oversizeBehavior: "not-acceptable",
      onObservation: () => undefined,
    });

    expect(options.converter).toBe(converter);
    expect(options.oversizeBehavior).toBe("not-acceptable");
    expect(options.onObservation).toBeTypeOf("function");
    expect("maxHtmlBytes" in options).toBe(false);
    expect("debugHeaders" in options).toBe(false);
  });
});
