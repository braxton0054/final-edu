"use client";

import { useState } from "react";

type SiteLogoProps = {
  tone?: "dark" | "light";
  height?: number;
};

// Shows the full lockup: donkey-M mark (/logo.png) + MTANDAOLABS wordmark.
// Falls back to the wordmark alone until /logo.png exists.
export default function SiteLogo({ tone = "dark", height = 44 }: SiteLogoProps) {
  const [showImg, setShowImg] = useState(true);
  const wordmark = (
    <span className={tone === "light" ? "lp-wordmark light" : "lp-wordmark"}>
      <span className="w-black">MTANDAO</span>
      <span className="w-orange">LABS</span>
    </span>
  );

  if (showImg) {
    return (
      <span className="lp-lockup">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          style={{ height }}
          onError={() => setShowImg(false)}
          className="lp-lockup-mark"
        />
        {wordmark}
      </span>
    );
  }

  return wordmark;
}
