import { stringify } from "yaml";

import type { ConversionMetadata, DefaultConverterOptions } from "./types";

export function buildFrontMatter(
  metadata: ConversionMetadata,
  fields: Required<Pick<DefaultConverterOptions, "frontMatterFields">>["frontMatterFields"],
): string {
  const ordered: ConversionMetadata = {};

  for (const field of fields) {
    const value = metadata[field];
    if (!value) {
      continue;
    }

    ordered[field] = value;
  }

  if (Object.keys(ordered).length === 0) {
    return "";
  }

  const yaml = stringify(ordered).trimEnd();
  return `---\n${yaml}\n---\n\n`;
}
