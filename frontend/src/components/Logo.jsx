import { useState } from "react";

export default function Logo({ size = 40, white = false, showText = true }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      {!imgError ? (
        <img src="/logo.png" alt="eCampus Vote"
          onError={() => setImgError(true)}
          style={{ height:size, width:"auto", objectFit:"contain", filter:white ? "brightness(0) invert(1)" : "none" }}
        />
      ) : (
        <div style={{ width:size, height:size, borderRadius:size*0.25, background:white ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.45, flexShrink:0 }}>
          🗳️
        </div>
      )}
      {showText && (
        <div>
          <div style={{ fontWeight:800, fontSize:size*0.42, color:white?"#fff":"#1e3a8a", fontFamily:"'Space Grotesk',sans-serif", lineHeight:1.2 }}>
            eCampus Vote
          </div>
          <div style={{ fontSize:size*0.28, color:white?"#93c5fd":"#64748b", lineHeight:1 }}>
            Your Vote. Your Voice.
          </div>
        </div>
      )}
    </div>
  );
}