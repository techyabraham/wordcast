export default function MobileBlockedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="text-6xl">🖥️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Desktop Required</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            The Wordcast Admin Dashboard is optimised for desktop browsers.
            Please open it on a laptop or desktop computer to continue.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-left space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Minimum recommended</p>
          <p className="text-sm text-slate-300">Screen width: 1024px or wider</p>
          <p className="text-sm text-slate-300">Browser: Chrome, Firefox, Edge, Safari</p>
        </div>
      </div>
    </div>
  );
}
