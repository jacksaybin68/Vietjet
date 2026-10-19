/**
 * Social login (Google / Apple / Facebook) theo giao diện SkyJoy SSO.
 *
 * ⚠️ Chưa có credential OAuth trong repo, nên phần này chỉ *sẵn sàng*: nút bấm
 * và endpoint khởi tạo đã có, provider nào được cấu hình qua env thì chuyển
 * hướng sang provider thật, provider chưa cấu hình trả 501 kèm thông báo rõ
 * ràng thay vì im lặng giả vờ thành công.
 *
 * Việc **bắt callback và liên kết tài khoản** (`/api/xac-thuc/social/[provider]/callback`)
 * là chỗ cắm còn lại: nó cần trao đổi `code` lấy token rồi map email về
 * `user_profiles`. Không có credential thì không thể kiểm thử, nên chưa viết để
 * tránh một đoạn code không ai chạy và không ai đo.
 */

export type SocialProvider = 'google' | 'apple' | 'facebook';

export const SOCIAL_PROVIDERS: Array<{ id: SocialProvider; label: string }> = [
  { id: 'google', label: 'Google' },
  { id: 'apple', label: 'Apple ID' },
  { id: 'facebook', label: 'Facebook' },
];

export function isSocialProvider(value: string): value is SocialProvider {
  return value === 'google' || value === 'apple' || value === 'facebook';
}

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  scope: string;
  extraParams?: Record<string, string>;
}

function providerConfig(provider: SocialProvider): ProviderConfig | null {
  switch (provider) {
    case 'google': {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'openid email profile',
      };
    }
    case 'facebook': {
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        scope: 'email,public_profile',
      };
    }
    case 'apple': {
      const clientId = process.env.APPLE_CLIENT_ID;
      const clientSecret = process.env.APPLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      return {
        clientId,
        clientSecret,
        authorizeUrl: 'https://appleid.apple.com/auth/authorize',
        scope: 'name email',
        extraParams: { response_mode: 'form_post' },
      };
    }
  }
}

/** Danh sách provider kèm trạng thái cấu hình, cho form quyết định hiển thị. */
export function getSocialProviders(): Array<{
  id: SocialProvider;
  label: string;
  enabled: boolean;
}> {
  return SOCIAL_PROVIDERS.map(({ id, label }) => ({
    id,
    label,
    enabled: providerConfig(id) !== null,
  }));
}

/** URL uỷ quyền của provider, hoặc `null` khi provider chưa được cấu hình. */
export function buildAuthorizeUrl(
  provider: SocialProvider,
  redirectUri: string,
  state: string
): string | null {
  const config = providerConfig(provider);
  if (!config) return null;

  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  for (const [key, value] of Object.entries(config.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
