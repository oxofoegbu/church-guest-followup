import type { Metadata, Viewport } from 'next';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';

export const viewport: Viewport = {
  themeColor:         '#102a43',
  width:              'device-width',
  initialScale:       1,
  maximumScale:       1,
  userScalable:       false,
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
