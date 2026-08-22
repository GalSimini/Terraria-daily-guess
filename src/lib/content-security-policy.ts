export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const scriptDevelopmentDirective = isDevelopment ? " 'unsafe-eval'" : "";
  const styleDevelopmentDirective = isDevelopment ? " 'unsafe-inline'" : ` 'nonce-${nonce}'`;

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptDevelopmentDirective}`,
    `style-src 'self'${styleDevelopmentDirective}`,
    "connect-src 'self'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}
