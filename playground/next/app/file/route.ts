export async function GET(): Promise<Response> {
  return new Response("id,name\n1,alpha\n2,beta\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="report.csv"',
    },
  });
}
