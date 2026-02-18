/**
 * Returns the base URL suitable for mobile access (QR codes, etc).
 * On localhost, replaces with the machine's local network IP.
 * Always uses the current protocol and port.
 */
export function getMobileOrigin(): string {
  if (typeof window === 'undefined') return '';

  const { protocol, hostname, port } = window.location;

  // If already on a network IP, use origin as-is
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return window.location.origin;
  }

  // On localhost: use the local network IP from env, or fallback
  const localIP = process.env.NEXT_PUBLIC_LOCAL_IP || hostname;
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${localIP}${portSuffix}`;
}

/**
 * Returns a full URL path suitable for mobile access.
 */
export function getMobileUrl(path: string): string {
  return `${getMobileOrigin()}${path}`;
}
