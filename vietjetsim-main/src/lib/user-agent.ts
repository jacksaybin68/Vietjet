/**
 * Minimal User-Agent classification.
 *
 * Deliberately dependency-free and best-effort: the value is only ever shown
 * back to the account owner in the security tab, never trusted for access
 * decisions.
 */

export interface DeviceDescription {
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
}

export function describeDevice(userAgent: string | null): DeviceDescription {
  const ua = userAgent ?? '';
  if (!ua)
    return {
      device_name: 'Không xác định',
      device_type: 'unknown',
      browser: 'Không xác định',
      os: 'Không xác định',
    };

  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  const deviceType = detectDeviceType(ua);

  return {
    device_name: `${browser} trên ${os}`,
    device_type: deviceType,
    browser,
    os,
  };
}

function detectOs(ua: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Không xác định';
}

function detectBrowser(ua: string): string {
  // Order matters: every Chromium browser also advertises Chrome and Safari.
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Không xác định';
}

function detectDeviceType(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}
