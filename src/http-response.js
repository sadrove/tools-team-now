export const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export function makeCorsHeaders(origin, allowedOrigins = []) {
  const headers = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, accept, mcp-protocol-version, mcp-session-id",
    "access-control-max-age": "86400",
    vary: "origin"
  };

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}

export function isOriginAllowed(origin, allowedOrigins = []) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.length === 0) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function parseAllowedOrigins(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
