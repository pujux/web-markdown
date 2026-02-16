import type { TransformFetchResponseOptions } from "./types";

export function toTransformFetchOptions(
  options: TransformFetchResponseOptions,
): TransformFetchResponseOptions {
  const transformOptions: TransformFetchResponseOptions = {
    converter: options.converter,
  };

  if (options.maxHtmlBytes !== undefined) {
    transformOptions.maxHtmlBytes = options.maxHtmlBytes;
  }

  if (options.oversizeBehavior !== undefined) {
    transformOptions.oversizeBehavior = options.oversizeBehavior;
  }

  if (options.debugHeaders !== undefined) {
    transformOptions.debugHeaders = options.debugHeaders;
  }

  if (options.onObservation !== undefined) {
    transformOptions.onObservation = options.onObservation;
  }

  return transformOptions;
}
