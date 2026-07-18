import { useEffect } from "react";

const ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";

type AdFitBannerProps = {
  slotKey: string;
  showSide?: boolean;
};

export function AdFitMobileTopBanner({ slotKey }: { slotKey: string }) {
  return (
    <aside className="adfit-mobile-top-banner" aria-label="광고">
      <ins
        key={`${slotKey}-mobile-top`}
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit="DAN-mzOAh4ii66DEoLwq"
        data-ad-width="320"
        data-ad-height="50"
      />
    </aside>
  );
}

export default function AdFitBanner({ slotKey, showSide = true }: AdFitBannerProps) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.querySelectorAll<HTMLScriptElement>("script[data-v26-adfit]").forEach((script) => {
      script.remove();
    });

    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.charset = "utf-8";
    script.dataset.v26Adfit = slotKey;
    script.src = ADFIT_SCRIPT_SRC;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [slotKey, showSide]);

  return (
    <>
      <aside className="adfit-banner" aria-label="광고">
        <ins
          key={`${slotKey}-bottom`}
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit="DAN-liZUYElBnSJmrdve"
          data-ad-width="320"
          data-ad-height="50"
        />
      </aside>
      {showSide && (
        <>
          <aside className="adfit-side-rail adfit-side-rail-left" aria-label="광고">
            <ins
              key={`${slotKey}-side-left`}
              className="kakao_ad_area"
              style={{ display: "none" }}
              data-ad-unit="DAN-HCzcBVooHN73xd5Q"
              data-ad-width="160"
              data-ad-height="600"
            />
          </aside>
          <aside className="adfit-side-rail adfit-side-rail-right" aria-label="광고">
            <ins
              key={`${slotKey}-side-right`}
              className="kakao_ad_area"
              style={{ display: "none" }}
              data-ad-unit="DAN-QB9RMdZh1o49GHe6"
              data-ad-width="160"
              data-ad-height="600"
            />
          </aside>
        </>
      )}
    </>
  );
}
