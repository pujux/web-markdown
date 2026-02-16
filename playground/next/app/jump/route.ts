export async function GET(request: Request): Promise<Response> {
  return Response.redirect(new URL("/rich", request.url), 302);
}
