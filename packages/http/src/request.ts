export function getRequestId(request: Request): string {
  const existingRequestId =
    request.headers.get("x-request-id") ?? request.headers.get("cf-ray") ?? request.headers.get("x-correlation-id");

  return existingRequestId?.trim() || crypto.randomUUID();
}

export function getRequestHostname(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    return host.split(":")[0] ?? host;
  }

  return new URL(request.url).hostname;
}
