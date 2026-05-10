export type SocialPlatform = 'YOUTUBE' | 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'X';

export const detectPlatform = (url: string): SocialPlatform | null => {
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'YOUTUBE';
  }
  if (lower.includes('instagram.com')) {
    return 'INSTAGRAM';
  }
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
    return 'FACEBOOK';
  }
  if (lower.includes('tiktok.com')) {
    return 'TIKTOK';
  }
  if (lower.includes('x.com') || lower.includes('twitter.com')) {
    return 'X';
  }

  return null;
};
