export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    kind: "api",
    note: "API routes are excluded from markdown endpoint rewrites by default.",
  });
}
