import {
  handleInternalMarkdownRequest,
  type NextMarkdownEndpointOptions
} from './internal';

export function createAppMarkdownEndpoint(options: NextMarkdownEndpointOptions) {
  return (request: Request): Promise<Response> => handleInternalMarkdownRequest(request, options);
}
