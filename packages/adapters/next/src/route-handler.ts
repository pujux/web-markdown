import {
  toTransformFetchOptions,
  transformFetchResponse,
  type TransformFetchResponseOptions,
} from "@web-markdown/transform-fetch";

export type NextMarkdownRouteHandlerOptions = TransformFetchResponseOptions;

export type NextRouteHandler<TRequest extends Request = Request, TContext = unknown> = (
  request: TRequest,
  context: TContext,
) => Response | Promise<Response>;

export function transformNextResponse(
  request: Request,
  response: Response,
  options: NextMarkdownRouteHandlerOptions,
): Promise<Response> {
  return transformFetchResponse(request, response, toTransformFetchOptions(options));
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
