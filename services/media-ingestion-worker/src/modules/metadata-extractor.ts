import { runCommand } from './command-runner';

export interface SocialVideoMetadata {
  title?: string;
  uploader?: string;
  thumbnail?: string;
  durationSeconds?: number;
  uploadDate?: string;
  platformVideoId?: string;
  ext?: string;
}

export const fetchMetadata = async (url: string): Promise<SocialVideoMetadata> => {
  const result = await runCommand('yt-dlp', ['--no-playlist', '--dump-single-json', url]);
  const parsed = JSON.parse(result.stdout) as Record<string, any>;
  const metadata = parsed._type === 'playlist' && Array.isArray(parsed.entries)
    ? (parsed.entries[0] ?? parsed)
    : parsed;

  return {
    title: metadata.title,
    uploader: metadata.uploader ?? metadata.channel,
    thumbnail: metadata.thumbnail,
    durationSeconds: typeof metadata.duration === 'number' ? metadata.duration : undefined,
    uploadDate: metadata.upload_date,
    platformVideoId: metadata.id,
    ext: metadata.ext,
  };
};
