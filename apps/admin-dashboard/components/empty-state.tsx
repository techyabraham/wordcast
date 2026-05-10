export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-surface-500 bg-surface-700/60 px-6 py-10 text-center">
      <h4 className="font-display text-lg text-ink-100">{title}</h4>
      {description ? <p className="mt-2 text-sm text-ink-300">{description}</p> : null}
    </div>
  );
}
