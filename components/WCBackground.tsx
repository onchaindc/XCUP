const layerStyle = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 0,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, rgba(5,7,13,0.18), rgba(5,7,13,0.62)), #05070d",
} as const;

const tileStyles = [
  {
    background:
      "repeating-radial-gradient(circle at 50% 50%, #00d64f 0 5px, #1825c8 6px 12px, #05070d 13px 19px)",
  },
  {
    background:
      "linear-gradient(90deg, #00e6ff 0 18%, #00ce4d 18% 34%, #e7ff00 34% 47%, #00e6ff 47% 62%, #00ce4d 62% 79%, #e7ff00 79% 100%)",
  },
  {
    background:
      "linear-gradient(135deg, #ee174c 0 26%, #25d9ff 26% 44%, #5d13a6 44% 62%, #00c44f 62% 100%)",
  },
  {
    background:
      "repeating-linear-gradient(0deg, #173079 0 5px, transparent 5px 12px), repeating-radial-gradient(ellipse at 40% 50%, transparent 0 13px, #f5a524 14px 16px, transparent 17px 30px), #171747",
  },
  {
    background:
      "linear-gradient(135deg, #00c44f 0 25%, #b9ff00 25% 50%, #00c44f 50% 75%, #b9ff00 75% 100%)",
    backgroundSize: "34px 34px",
  },
  {
    background:
      "linear-gradient(135deg, #ee174c 0 22%, #ff8b71 22% 40%, #1666e8 40% 58%, #7912b8 58% 76%, #00c44f 76% 100%)",
  },
  {
    background:
      "repeating-linear-gradient(90deg, #e7ff00 0 10px, #1f91ff 10px 20px, #101a70 20px 30px, #00c44f 30px 40px)",
  },
  {
    background:
      "linear-gradient(45deg, #5d13a6 0 20%, #082747 20% 42%, #00c44f 42% 58%, #0a174c 58% 78%, #7415b5 78% 100%)",
  },
  {
    background:
      "linear-gradient(135deg, #22d7ff 0 25%, #052a4f 25% 50%, #00c44f 50% 75%, #f6ff00 75% 100%)",
  },
] as const;

function TrophyMark() {
  return (
    <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="wc-gold" x1="20%" x2="80%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#fff0a3" />
          <stop offset="35%" stopColor="#d6a63b" />
          <stop offset="70%" stopColor="#8b5b18" />
          <stop offset="100%" stopColor="#f8d873" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="38" rx="30" ry="24" fill="url(#wc-gold)" />
      <path d="M21 29 Q8 37 12 53 Q17 65 29 58" fill="none" stroke="#f6d775" strokeWidth="5" />
      <path d="M79 29 Q92 37 88 53 Q83 65 71 58" fill="none" stroke="#f6d775" strokeWidth="5" />
      <path d="M36 56 C39 68 42 84 42 101 H58 C58 84 61 68 64 56 Z" fill="url(#wc-gold)" />
      <rect x="29" y="101" width="42" height="12" rx="4" fill="url(#wc-gold)" />
      <rect x="21" y="113" width="58" height="10" rx="3" fill="#d6a63b" />
      <ellipse cx="50" cy="38" rx="15" ry="16" fill="none" stroke="#8b5b18" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}

export default function WCBackground() {
  return (
    <>
      <div style={layerStyle} aria-hidden="true">
        <div
          style={{
            position: "absolute",
            inset: "-8% -7%",
            background:
              "radial-gradient(circle at 12% 16%, rgba(255,255,255,0.45), transparent 0 9%, transparent 13%), radial-gradient(circle at 92% 22%, rgba(255,137,111,0.65), transparent 0 12%, transparent 18%), linear-gradient(135deg, #6500a8 0 12%, #00c928 12% 34%, #e7ff00 34% 62%, #00c928 62% 78%, #6500a8 78% 100%)",
            opacity: 0.82,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "-7vw",
            top: "8vh",
            width: "114vw",
            height: "24vh",
            background: "#00c928",
            transform: "skewY(-6deg)",
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-8vw",
            bottom: "10vh",
            width: "118vw",
            height: "24vh",
            background: "#6b00a8",
            transform: "skewY(8deg)",
            opacity: 0.9,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-9vw",
            bottom: "22vh",
            width: "118vw",
            height: "8vh",
            background: "#ff8b71",
            transform: "skewY(-4deg)",
            opacity: 0.86,
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(92vw, 980px)",
            height: "min(92vh, 900px)",
            transform: "translate(-50%, -50%)",
            opacity: 0.52,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "2%",
              top: "-3%",
              width: "96%",
              height: "50%",
              border: "clamp(80px, 13vw, 160px) solid #e7ff00",
              borderBottom: 0,
              borderRadius: "999px 999px 0 0",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "4%",
              bottom: "-2%",
              width: "92%",
              height: "56%",
              border: "clamp(86px, 14vw, 170px) solid #e7ff00",
              borderTop: 0,
              borderRadius: "0 0 999px 999px",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "42%",
              top: "28%",
              width: "34%",
              height: "44%",
              background: "#050505",
              borderRadius: "26% 20% 28% 22%",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(48vw, 520px)",
            height: "min(58vh, 540px)",
            transform: "translate(-50%, -50%)",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridAutoRows: "1fr",
            gap: "0",
            opacity: 0.58,
            borderRadius: "24px",
            overflow: "hidden",
          }}
        >
          {tileStyles.map((style, index) => (
            <div key={index} style={style} />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "51%",
            width: "min(25vw, 260px)",
            height: "min(35vh, 320px)",
            transform: "translate(-50%, -50%)",
            borderRadius: "30px",
            background: "#020202",
            opacity: 0.72,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 26px 90px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ width: "58%", height: "72%", opacity: 0.9 }}>
            <TrophyMark />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 48%, transparent 0 22%, rgba(5,7,13,0.18) 48%, rgba(5,7,13,0.86) 100%), linear-gradient(180deg, rgba(5,7,13,0.18), rgba(5,7,13,0.72))",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: "min(100vw, 92rem)",
            transform: "translateX(-50%)",
            background:
              "radial-gradient(circle at 50% 48%, rgba(24, 227, 189, 0.08), transparent 24rem), radial-gradient(circle at 16% 18%, rgba(255, 92, 57, 0.12), transparent 18rem), radial-gradient(circle at 84% 14%, rgba(245, 165, 36, 0.08), transparent 16rem), linear-gradient(180deg, #05070d 0%, #030409 55%, #06080f 100%)",
            boxShadow: "0 0 80px 80px rgba(5, 7, 13, 0.42)",
          }}
        />
      </div>
    </>
  );
}
