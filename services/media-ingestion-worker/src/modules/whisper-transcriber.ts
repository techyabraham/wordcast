import { createReadStream } from 'fs';
import OpenAI from 'openai';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
  durationSeconds?: number;
  language?: string;
}

export class WhisperTranscriber {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(filePath: string): Promise<TranscriptionResult> {
    const response = (await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: createReadStream(filePath),
      response_format: 'verbose_json',
    })) as any;

    const segments = Array.isArray(response.segments)
      ? response.segments.map((segment: any) => ({
          start: Number(segment.start ?? 0),
          end: Number(segment.end ?? 0),
          text: String(segment.text ?? '').trim(),
        }))
      : [];

    return {
      text: String(response.text ?? '').trim(),
      segments,
      ...(response.duration ? { durationSeconds: Number(response.duration) } : {}),
      ...(response.language ? { language: String(response.language) } : {}),
    };
  }
}
