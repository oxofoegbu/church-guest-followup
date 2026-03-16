import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grace Life Center — Welcome',
};

const FORM_URL = 'https://welcome.gracelifecenter.com';

export default function DisplayPage() {
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&ecc=H&color=102a43&bgcolor=faf8f4&data=${encodeURIComponent(FORM_URL)}`;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }

          body {
            background: #0c1e30;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            overflow: hidden;
          }

          /* Subtle dot grid */
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
          }

          /* Glowing orbs */
          .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(140px);
            pointer-events: none;
            z-index: 0;
          }
          .orb-1 { width: 700px; height: 700px; top: -250px; left: -200px; background: rgba(74,23,114,0.4); }
          .orb-2 { width: 500px; height: 500px; bottom: -180px; right: -100px; background: rgba(190,30,45,0.25); }
          .orb-3 { width: 400px; height: 400px; top: 30%; left: 50%; background: rgba(196,144,50,0.12); }

          .page {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: center;
          }

          /* ── LEFT PANEL ── */
          .left {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(40px, 6vw, 100px);
            padding-right: clamp(20px, 3vw, 60px);
          }

          .logo-wrap {
            margin-bottom: clamp(28px, 4vw, 52px);
            animation: fadeDown 0.8s ease both;
          }
          .logo-wrap img {
            height: clamp(70px, 9vw, 130px);
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 4px 20px rgba(196,144,50,0.3));
          }

          .welcome-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(196,144,50,0.12);
            border: 1px solid rgba(196,144,50,0.35);
            border-radius: 100px;
            padding: 7px 18px;
            margin-bottom: clamp(16px, 2vw, 28px);
            animation: fadeDown 0.8s 0.1s ease both;
            width: fit-content;
          }
          .badge-dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #c49032;
            animation: pulse 2s ease infinite;
          }
          .welcome-badge span {
            color: #c49032;
            font-size: clamp(11px, 1.2vw, 14px);
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          h1 {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: clamp(36px, 5.5vw, 76px);
            font-weight: 900;
            color: #ffffff;
            line-height: 1.05;
            letter-spacing: -1px;
            margin-bottom: clamp(10px, 1.5vw, 20px);
            animation: fadeDown 0.8s 0.15s ease both;
          }
          h1 em {
            font-style: normal;
            color: #c49032;
          }

          .subtitle {
            font-size: clamp(14px, 1.8vw, 22px);
            color: rgba(255,255,255,0.45);
            font-weight: 300;
            line-height: 1.5;
            margin-bottom: clamp(28px, 4vw, 52px);
            animation: fadeDown 0.8s 0.2s ease both;
            max-width: 480px;
          }

          /* Steps */
          .steps {
            display: flex;
            flex-direction: column;
            gap: 14px;
            animation: fadeUp 0.8s 0.3s ease both;
          }
          .step {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .step-num {
            width: clamp(32px, 3vw, 42px);
            height: clamp(32px, 3vw, 42px);
            border-radius: 50%;
            background: rgba(196,144,50,0.15);
            border: 1px solid rgba(196,144,50,0.4);
            color: #c49032;
            font-size: clamp(13px, 1.4vw, 17px);
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .step p {
            color: rgba(255,255,255,0.6);
            font-size: clamp(13px, 1.4vw, 18px);
            font-weight: 400;
          }
          .step p strong { color: rgba(255,255,255,0.9); font-weight: 600; }

          /* ── RIGHT PANEL ── */
          .right {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: clamp(40px, 6vw, 100px);
            padding-left: clamp(20px, 3vw, 60px);
            animation: scaleIn 0.9s 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
          }

          .qr-card {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 32px;
            padding: clamp(28px, 4vw, 52px);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: clamp(16px, 2.5vw, 28px);
            position: relative;
            animation: glow 5s 1.5s ease infinite;
          }

          /* Gold corner accents */
          .qr-card::before, .qr-card::after {
            content: '';
            position: absolute;
            width: 32px; height: 32px;
            border-color: #c49032;
            border-style: solid;
            opacity: 0.5;
          }
          .qr-card::before { top: 18px; left: 18px; border-width: 2px 0 0 2px; border-radius: 6px 0 0 0; }
          .qr-card::after  { bottom: 18px; right: 18px; border-width: 0 2px 2px 0; border-radius: 0 0 6px 0; }

          .qr-label {
            font-size: clamp(11px, 1.1vw, 14px);
            font-weight: 600;
            color: rgba(255,255,255,0.35);
            letter-spacing: 0.15em;
            text-transform: uppercase;
          }

          .qr-frame {
            background: #faf8f4;
            border-radius: 20px;
            padding: clamp(14px, 2vw, 24px);
            box-shadow:
              0 0 0 1px rgba(16,42,67,0.08),
              0 24px 80px rgba(0,0,0,0.5),
              0 0 60px rgba(196,144,50,0.08);
          }
          .qr-frame img {
            display: block;
            width: clamp(180px, 22vw, 320px);
            height: clamp(180px, 22vw, 320px);
          }

          /* Church icon overlay on QR */
          .qr-instruction {
            text-align: center;
          }
          .qr-instruction .primary {
            font-family: 'Playfair Display', serif;
            font-size: clamp(16px, 2vw, 26px);
            color: #ffffff;
            font-weight: 700;
            margin-bottom: 5px;
          }
          .qr-instruction .secondary {
            font-size: clamp(11px, 1.2vw, 15px);
            color: rgba(255,255,255,0.4);
            font-weight: 300;
          }

          /* URL pill */
          .url-pill {
            margin-top: clamp(16px, 2vw, 28px);
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 100px;
            padding: clamp(8px,1vw,12px) clamp(16px,2vw,24px);
          }
          .url-dot { width: 8px; height: 8px; border-radius: 50%; background: #c49032; animation: pulse 2s ease infinite; }
          .url-pill span {
            font-size: clamp(13px, 1.4vw, 18px);
            color: rgba(255,255,255,0.5);
            font-weight: 300;
          }
          .url-pill strong { color: #c49032; font-weight: 600; }

          /* Divider */
          .divider {
            width: 1px; height: 100%;
            background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent);
            position: absolute;
            left: 50%;
            top: 0;
          }

          /* Animations */
          @keyframes fadeDown {
            from { opacity: 0; transform: translateY(-24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.82); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%,100% { opacity:1; transform:scale(1); }
            50%      { opacity:0.4; transform:scale(0.65); }
          }
          @keyframes glow {
            0%,100% { box-shadow: 0 0 40px rgba(74,23,114,0.15); }
            50%      { box-shadow: 0 0 80px rgba(74,23,114,0.3), 0 0 120px rgba(196,144,50,0.08); }
          }
        `}</style>
      </head>
      <body>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="divider" />

        <div className="page">

          {/* ── LEFT ── */}
          <div className="left">
            <div className="logo-wrap">
              <img src="/logo-icon.png" alt="Grace Life Center" />
            </div>

            <div className="welcome-badge">
              <div className="badge-dot" />
              <span>Grace Life Center</span>
            </div>

            <h1>Welcome,<br /><em>Honoured</em><br />Guest!</h1>

            <p className="subtitle">
              We're so glad you're here today.<br />
              Fill in your guest card in seconds — right from your phone.
            </p>

            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <p>Open your <strong>phone camera</strong></p>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <p><strong>Point</strong> at the QR code →</p>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <p><strong>Tap the link</strong> that appears</p>
              </div>
              <div className="step">
                <div className="step-num">4</div>
                <p>Fill in your <strong>details</strong> — takes 60 seconds</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div className="right">
            <div className="qr-card">
              <p className="qr-label">Scan to register</p>

              <div className="qr-frame">
                <img
                  src={qrApiUrl}
                  alt="QR Code — welcome.gracelifecenter.com"
                  width={320}
                  height={320}
                />
              </div>

              <div className="qr-instruction">
                <p className="primary">Point your camera here</p>
                <p className="secondary">Works on any iPhone or Android — no app needed</p>
              </div>
            </div>

            <div className="url-pill">
              <div className="url-dot" />
              <span>Or visit: <strong>welcome.gracelifecenter.com</strong></span>
            </div>
          </div>

        </div>
      </body>
    </html>
  );
}
