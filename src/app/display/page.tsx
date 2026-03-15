import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grace Life Center — Welcome',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://church-guest-followup.vercel.app';
const FORM_URL = APP_URL;

// Generates a QR code SVG path using a simple URL encoding via Google Charts API
// We use a server component so the URL is baked in at render time

export default function DisplayPage() {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&ecc=H&color=102a43&bgcolor=faf8f4&data=${encodeURIComponent(FORM_URL)}`;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            background: #102a43;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
          }

          /* Animated background cross pattern */
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image:
              repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px),
              repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px);
            pointer-events: none;
          }

          /* Glowing orbs for depth */
          .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(120px);
            pointer-events: none;
          }
          .orb-1 { width: 600px; height: 600px; top: -200px; left: -200px; background: rgba(74, 23, 114, 0.35); }
          .orb-2 { width: 500px; height: 500px; bottom: -150px; right: -100px; background: rgba(213, 125, 42, 0.2); }
          .orb-3 { width: 400px; height: 400px; top: 40%; left: 55%; background: rgba(74, 23, 114, 0.15); }

          .container {
            position: relative;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
            z-index: 1;
          }

          /* Top badge */
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(213, 125, 42, 0.15);
            border: 1px solid rgba(213, 125, 42, 0.4);
            border-radius: 100px;
            padding: 8px 20px;
            margin-bottom: 28px;
            animation: fadeDown 0.8s ease both;
          }
          .badge span { color: #d57d2a; font-size: 13px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
          .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #d57d2a; animation: pulse 2s ease infinite; }

          /* Church name */
          .church-name {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: clamp(42px, 6vw, 80px);
            font-weight: 900;
            color: #ffffff;
            text-align: center;
            line-height: 1.05;
            letter-spacing: -1px;
            margin-bottom: 12px;
            animation: fadeDown 0.8s 0.1s ease both;
          }

          .tagline {
            font-size: clamp(16px, 2vw, 22px);
            color: rgba(255,255,255,0.5);
            font-weight: 300;
            letter-spacing: 0.04em;
            margin-bottom: 52px;
            animation: fadeDown 0.8s 0.2s ease both;
          }

          /* QR card */
          .qr-card {
            background: rgba(255,255,255,0.06);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 28px;
            padding: 40px 48px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 28px;
            margin-bottom: 48px;
            animation: scaleIn 0.8s 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            position: relative;
          }

          /* Gold corner accents */
          .qr-card::before, .qr-card::after {
            content: '';
            position: absolute;
            width: 28px;
            height: 28px;
            border-color: #d57d2a;
            border-style: solid;
            opacity: 0.6;
          }
          .qr-card::before { top: 16px; left: 16px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
          .qr-card::after  { bottom: 16px; right: 16px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

          .qr-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255,255,255,0.4);
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }

          .qr-image-wrap {
            background: #faf8f4;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 0 0 1px rgba(16,42,67,0.1), 0 20px 60px rgba(0,0,0,0.4);
          }

          .qr-image-wrap img {
            display: block;
            width: clamp(200px, 22vw, 320px);
            height: clamp(200px, 22vw, 320px);
          }

          .qr-instruction {
            text-align: center;
          }
          .qr-instruction p:first-child {
            font-family: 'Playfair Display', serif;
            font-size: clamp(18px, 2.5vw, 28px);
            color: #ffffff;
            font-weight: 700;
            margin-bottom: 6px;
          }
          .qr-instruction p:last-child {
            font-size: clamp(13px, 1.5vw, 17px);
            color: rgba(255,255,255,0.45);
            font-weight: 300;
          }

          /* URL pill */
          .url-pill {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.07);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 100px;
            padding: 12px 24px;
            margin-bottom: 48px;
            animation: fadeUp 0.8s 0.5s ease both;
          }
          .url-pill span { color: rgba(255,255,255,0.6); font-size: clamp(13px, 1.5vw, 18px); font-weight: 300; letter-spacing: 0.02em; }
          .url-pill strong { color: #d57d2a; font-weight: 500; }

          /* Bottom steps */
          .steps {
            display: flex;
            gap: clamp(24px, 4vw, 60px);
            animation: fadeUp 0.8s 0.6s ease both;
          }
          .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            text-align: center;
          }
          .step-num {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(213, 125, 42, 0.2);
            border: 1px solid rgba(213, 125, 42, 0.4);
            color: #d57d2a;
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .step p { color: rgba(255,255,255,0.45); font-size: clamp(11px, 1.2vw, 15px); font-weight: 300; max-width: 120px; line-height: 1.4; }

          /* Divider */
          .divider {
            width: 1px;
            height: 40px;
            background: rgba(255,255,255,0.1);
            align-self: center;
          }

          /* Animations */
          @keyframes fadeDown {
            from { opacity: 0; transform: translateY(-20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.85); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.7); }
          }

          /* Breathing glow on QR card */
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 40px rgba(74,23,114,0.2); }
            50%       { box-shadow: 0 0 80px rgba(74,23,114,0.4), 0 0 120px rgba(213,125,42,0.1); }
          }
          .qr-card { animation: scaleIn 0.8s 0.3s cubic-bezier(0.34,1.56,0.64,1) both, glow 4s 1.5s ease infinite; }
        `}</style>
      </head>
      <body>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="container">
          {/* Badge */}
          <div className="badge">
            <div className="badge-dot" />
            <span>You're Welcome Here</span>
          </div>

          {/* Church name */}
          <h1 className="church-name">Grace Life Center</h1>
          <p className="tagline">Register as our guest today</p>

          {/* QR card */}
          <div className="qr-card">
            <p className="qr-label">Scan to fill in your guest card</p>
            <div className="qr-image-wrap">
              <img
                src={qrApiUrl}
                alt="QR Code to guest form"
                width={320}
                height={320}
              />
            </div>
            <div className="qr-instruction">
              <p>Point your phone camera here</p>
              <p>No app needed — opens instantly in your browser</p>
            </div>
          </div>

          {/* URL */}
          <div className="url-pill">
            <span>Or visit: <strong>{FORM_URL.replace('https://', '')}</strong></span>
          </div>

          {/* Steps */}
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <p>Open your camera app</p>
            </div>
            <div className="divider" />
            <div className="step">
              <div className="step-num">2</div>
              <p>Point at the QR code</p>
            </div>
            <div className="divider" />
            <div className="step">
              <div className="step-num">3</div>
              <p>Tap the link that appears</p>
            </div>
            <div className="divider" />
            <div className="step">
              <div className="step-num">4</div>
              <p>Fill in your details</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
