export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-danger-500/40 bg-danger-500/10 px-6 py-6">
      <h4 className="font-display text-lg text-danger-500">{title}</h4>
      {description ? <p className="mt-2 text-sm text-ink-200">{description}</p> : null}
    </div>
  );
}
