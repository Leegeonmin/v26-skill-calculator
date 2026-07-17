import { useEffect } from "react";

const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

type AdFitBannerProps = {
  slotKey: string;
};

export default function AdFitBanner({ slotKey }: AdFitBannerProps) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.charset = "utf-8";
    script.src = ADFIT_SCRIPT_SRC;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [slotKey]);

  return (
    <aside className="adfit-banner" aria-label="광고">
      <ins
        key={slotKey}
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit="DAN-liZUYElBnSJmrdve"
        data-ad-width="320"
        data-ad-height="50"
      />
    </aside>
  );
}
