import type { Metadata, Viewport } from 'next';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://gracelifecenter.com';

export const viewport: Viewport = {
  themeColor:         '#102a43',
  width:              'device-width',
  initialScale:       1,
  // Run 55 — maximumScale:1 + userScalable:false were REMOVED here.
  //
  // They were added to make the installed PWA feel native (they suppress
  // double-tap zoom). The cost was a WCAG 2.1 AA failure: SC 1.4.4 (Resize
  // Text) requires text to scale to 200%, and locking the viewport denies
  // that to exactly the people who need it most — older congregants trying
  // to read a reflection question on a phone.
  //
  // The lock was never even consistent: iOS Safari has ignored
  // user-scalable=no since iOS 10, so iPhone users could always pinch while
  // Android users could not. Same app, two rules.
  //
  // Do not put them back. If double-tap zoom ever feels janky, fix it with
  // touch-action / tap-target sizing in CSS, which does not disable zoom.
};

export const metadata: Metadata = {
  metadataBase:       new URL(APP_URL),
  title:              'Grace Life Center',
  description:        'Guest follow-up, Sunday schedule, and team management — Grace Life Center, Charismatic Renewal Ministries',
  applicationName:    'Grace Life Center',
  manifest:           '/manifest.json',
  appleWebApp: {
    capable:          true,
    statusBarStyle:   'black-translucent',
    title:            'Grace Life Center',
  },
  icons: {
    icon:        [
      { url: '/favicon.ico',       sizes: '32x32',  type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'  },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'  },
    ],
    apple:       [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title:       'Grace Life Center',
    description: 'Guest follow-up, Sunday schedule, and team management',
    url:         APP_URL,
    siteName:    'Grace Life Center',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered'); })
                .catch(function(err) { console.log('SW failed:', err); });
            });
          }
        `}} />
        {/* iOS PWA splash / status bar */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
