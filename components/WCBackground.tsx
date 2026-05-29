export default function WCBackground() {
  return (
    <>
      {/* Fixed full-screen WC2026 decorative layer — pure visual, no interactivity */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        {/* === BOTTOM-LEFT: WC2026 concentric arch rings === */}
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            left: "-200px",
            width: "650px",
            height: "650px",
            borderRadius: "50%",
            background: "transparent",
            boxShadow: `
              0 0 0 20px rgba(193, 18, 31, 0.22),
              0 0 0 44px rgba(232, 93, 4, 0.20),
              0 0 0 68px rgba(244, 140, 6, 0.18),
              0 0 0 92px rgba(212, 160, 23, 0.16),
              0 0 0 116px rgba(45, 106, 79, 0.14),
              0 0 0 140px rgba(29, 78, 137, 0.13),
              0 0 0 164px rgba(106, 13, 173, 0.10)
            `,
          }}
        />

        {/* === TOP-RIGHT: smaller arch cluster === */}
        <div
          style={{
            position: "absolute",
            top: "-140px",
            right: "-140px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "transparent",
            boxShadow: `
              0 0 0 16px rgba(193, 18, 31, 0.14),
              0 0 0 34px rgba(232, 93, 4, 0.12),
              0 0 0 52px rgba(244, 140, 6, 0.10),
              0 0 0 70px rgba(212, 160, 23, 0.09),
              0 0 0 88px rgba(29, 78, 137, 0.08)
            `,
          }}
        />

        {/* === CENTER-RIGHT: trophy silhouette as inline SVG === */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "3%",
            transform: "translateY(-50%)",
            opacity: 0.07,
            width: "180px",
            height: "260px",
          }}
        >
          <svg
            viewBox="0 0 100 160"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%" }}
          >
            <ellipse cx="50" cy="38" rx="32" ry="24" fill="none" stroke="#C9A84C" strokeWidth="3" />
            <path d="M18 30 Q5 38 10 52 Q15 62 26 58" fill="none" stroke="#C9A84C" strokeWidth="2.5" />
            <path d="M82 30 Q95 38 90 52 Q85 62 74 58" fill="none" stroke="#C9A84C" strokeWidth="2.5" />
            <rect x="44" y="62" width="12" height="40" fill="#C9A84C" rx="2" />
            <rect x="28" y="102" width="44" height="10" fill="#C9A84C" rx="3" />
            <rect x="22" y="112" width="56" height="8" fill="#C9A84C" rx="2" />
            <circle cx="50" cy="36" r="16" fill="none" stroke="#C9A84C" strokeWidth="1.5" />
            <ellipse cx="50" cy="36" rx="16" ry="7" fill="none" stroke="#C9A84C" strokeWidth="1" />
          </svg>
        </div>

        {/* === AMBIENT GOLD GLOW — top right radial === */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(201,168,76,0.09) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* === GOLD TOP BAR — 2px shimmer line at very top === */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          pointerEvents: "none",
          zIndex: 9999,
          background:
            "linear-gradient(to right, transparent 0%, #C9A84C 25%, #F4D03F 50%, #C9A84C 75%, transparent 100%)",
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
    </>
  );
}
