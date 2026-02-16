import {
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export type NextMarkdownRouteHandlerOptions = TransformFetchResponseOptions;

export type NextRouteHandler<TRequest extends Request = Request, TContext = unknown> = (
  request: TRequest,
  context: TContext,
) => Response | Promise<Response>;

function toTransformOptions(
  options: NextMarkdownRouteHandlerOptions,
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

export function transformNextResponse(
  request: Request,
  response: Response,
  options: NextMarkdownRouteHandlerOptions,
): Promise<Response> {
  return transformFetchResponse(request, response, toTransformOptions(options));
}

export function withNextMarkdownRouteHandler<
  TRequest extends Request = Request,
  TContext = unknown,
>(
  handler: NextRouteHandler<TRequest, TContext>,
  options: NextMarkdownRouteHandlerOptions,
): NextRouteHandler<TRequest, TContext> {
  return async (request: TRequest, context: TContext): Promise<Response> => {
    const response = await handler(request, context);
    return transformNextResponse(request, response, options);
  };
}

export const createNextMarkdownRouteHandler = withNextMarkdownRouteHandler;
