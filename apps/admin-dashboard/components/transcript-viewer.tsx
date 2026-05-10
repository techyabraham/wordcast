export function TranscriptViewer({
  text,
  transcript,
}: {
  text?: string | null;
  transcript?: string | null;
}) {
  const content = text ?? transcript;

  if (!content) {
    return (
      <div className="rounded-xl border border-surface-500 bg-surface-700/60 p-4 text-sm text-ink-300">
        Transcript not available yet.
      </div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-surface-500 bg-surface-700/60 p-4 text-sm leading-6 text-ink-200">
      {content.split('\n').map((line, index) => (
        <p key={index} className="mb-2 last:mb-0">
          {line}
        </p>
      ))}
    </div>
  );
}
