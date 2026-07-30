export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);

  headers.set("content-type", "application/json; charset=utf-8");

  return Response.json(data, {
    ...init,
    headers,
  });
}
