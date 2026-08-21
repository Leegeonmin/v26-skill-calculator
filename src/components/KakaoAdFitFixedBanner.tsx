import { useEffect } from "react";

const KAKAO_ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";
const KAKAO_ADFIT_BOTTOM_UNIT = "DAN-liZUYElBnSJmrdve";
const KAKAO_ADFIT_SIDE_UNIT = "DAN-QB9RMdZh1o49GHe6";
const KAKAO_ADFIT_MOBILE_TOP_UNIT = "DAN-mzOAh4ii66DEoLwq";
const KAKAO_ADFIT_MOBILE_MID_UNIT = "DAN-dEaKCISEB3UejEIK";
const KAKAO_ADFIT_PC_TOP_UNIT = "DAN-wgEEvq8xMIF8IePY";

type KakaoAdFitFixedBannerProps = {
  enabled: boolean;
};

export default function KakaoAdFitFixedBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle("has-fixed-adfit-ad", enabled);

    if (!enabled) {
      return () => {
        document.body.classList.remove("has-fixed-adfit-ad");
      };
    }

    if (!document.querySelector<HTMLScriptElement>("script[data-v26-kakao-adfit]")) {
      const script = document.createElement("script");
      script.async = true;
      script.type = "text/javascript";
      script.dataset.v26KakaoAdfit = "true";
      script.src = KAKAO_ADFIT_SCRIPT_SRC;
      document.body.appendChild(script);
    }

    return () => {
      document.body.classList.remove("has-fixed-adfit-ad");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <aside className="kakao-adfit-fixed-banner" aria-label="광고">
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit={KAKAO_ADFIT_BOTTOM_UNIT}
          data-ad-width="320"
          data-ad-height="50"
        />
      </aside>
      <aside className="kakao-adfit-side-banner kakao-adfit-side-banner-left" aria-label="광고">
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit={KAKAO_ADFIT_SIDE_UNIT}
          data-ad-width="160"
          data-ad-height="600"
        />
      </aside>
    </>
  );
}

export function KakaoAdFitMobileTopBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  if (!enabled) return null;

  return (
    <aside className="kakao-adfit-mobile-top-banner" aria-label="광고">
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={KAKAO_ADFIT_MOBILE_TOP_UNIT}
        data-ad-width="320"
        data-ad-height="100"
      />
    </aside>
  );
}

export function KakaoAdFitMobileMidBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  if (!enabled) return null;

  return (
    <aside className="kakao-adfit-mobile-mid-banner" aria-label="광고">
      <ins
        className="kakao_ad_area"
        style={{ display: "none" }}
        data-ad-unit={KAKAO_ADFIT_MOBILE_MID_UNIT}
        data-ad-width="320"
        data-ad-height="50"
      />
    </aside>
  );
}

export function KakaoAdFitPcTopTripleBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  if (!enabled) return null;

  return (
    <aside className="kakao-adfit-pc-top-row" aria-label="광고">
      {Array.from({ length: 3 }, (_, index) => (
        <ins
          key={index}
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit={KAKAO_ADFIT_PC_TOP_UNIT}
          data-ad-width="300"
          data-ad-height="250"
        />
      ))}
    </aside>
  );
}
