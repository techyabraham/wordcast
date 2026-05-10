import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Wordcast Admin',
  description: 'Wordcast staff dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>
          <div className="mobile-guard">
            <h1 className="font-display text-xl font-semibold">Wordcast Admin is desktop-only</h1>
            <p className="mt-3 text-sm text-ink-300">
              Use a desktop browser to manage sermons, uploads, and AI review queues.
            </p>
          </div>
          <div className="desktop-shell">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
