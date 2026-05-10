'use client';

import { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';

export function UploadDropzone({
  value,
  onChange,
  accept,
  helper,
}: {
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  helper?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = (files: FileList | null) => {
    if (!files || !files.length) {
      onChange(null);
      return;
    }
    const file = files.item(0);
    onChange(file ?? null);
  };

  return (
    <div
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-surface-500 bg-surface-700/60 px-6 py-6 text-center text-ink-300 transition hover:border-brand-400',
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files);
      }}
    >
      <UploadCloud className="h-5 w-5 text-brand-300" />
      <p className="mt-2 text-sm text-ink-200">{value ? value.name : 'Drag an audio file or click to browse.'}</p>
      {helper ? <p className="mt-1 text-xs text-ink-400">{helper}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => onFile(event.target.files)}
        className="hidden"
      />
    </div>
  );
}
