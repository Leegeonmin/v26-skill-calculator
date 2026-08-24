import { useEffect, useRef } from "react";
import { getOrCreateRevenueSessionId, logRevenueEvent } from "../lib/revenueAnalytics";

const KAKAO_ADFIT_SCRIPT_SRC = "https://t1.kakaocdn.net/kas/static/ba.min.js";
const KAKAO_ADFIT_BOTTOM_UNIT = "DAN-liZUYElBnSJmrdve";
const KAKAO_ADFIT_PC_BOTTOM_UNIT = "DAN-txLtDHwa08Yk9jUg";
const KAKAO_ADFIT_SIDE_UNIT = "DAN-QB9RMdZh1o49GHe6";
const KAKAO_ADFIT_MOBILE_TOP_UNIT = "DAN-mzOAh4ii66DEoLwq";
const KAKAO_ADFIT_MOBILE_MID_UNIT = "DAN-dEaKCISEB3UejEIK";
const KAKAO_ADFIT_PC_TOP_UNITS = [
  "DAN-wgEEvq8xMIF8IePY",
  "DAN-vkuJvjZPyux3QQoh",
  "DAN-ephNLvlCbInhQxvW",
];

type KakaoAdFitFixedBannerProps = {
  enabled: boolean;
};

type KakaoAdFitSlotProps = {
  className?: string;
  adUnit: string;
  width: number;
  height: number;
  slot: string;
};

function useKakaoAdFitScript(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.dataset.v26KakaoAdfit = "true";
    script.src = KAKAO_ADFIT_SCRIPT_SRC;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [enabled]);
}

function KakaoAdFitIns({ adUnit, width, height, slot }: Omit<KakaoAdFitSlotProps, "className">) {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const sessionId = getOrCreateRevenueSessionId();
    const element = adRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    let didLogViewable = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const isViewable = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5
        );

        if (!isViewable || didLogViewable) {
          return;
        }

        didLogViewable = true;
        void logRevenueEvent({
          eventType: "ad_viewable",
          sessionId,
          adSlot: slot,
          adUnit,
          adWidth: width,
          adHeight: height,
        }).catch(() => {});
        observer.disconnect();
      },
      { threshold: [0.5] }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [adUnit, height, slot, width]);

  return (
    <ins
      ref={adRef}
      className="kakao_ad_area"
      style={{ display: "none" }}
      data-ad-unit={adUnit}
      data-ad-width={String(width)}
      data-ad-height={String(height)}
    />
  );
}

function KakaoAdFitSlot({ className, adUnit, width, height, slot }: KakaoAdFitSlotProps) {
  return (
    <aside className={className} aria-label="광고">
      <KakaoAdFitIns adUnit={adUnit} width={width} height={height} slot={slot} />
    </aside>
  );
}

export default function KakaoAdFitFixedBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  useKakaoAdFitScript(enabled);

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.body.classList.toggle("has-fixed-adfit-ad", enabled);

    if (!enabled) {
      return () => {
        document.body.classList.remove("has-fixed-adfit-ad");
      };
    }

    return () => {
      document.body.classList.remove("has-fixed-adfit-ad");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <KakaoAdFitSlot
        className="kakao-adfit-fixed-banner"
        adUnit={KAKAO_ADFIT_BOTTOM_UNIT}
        width={320}
        height={50}
        slot="mobile_bottom_fixed"
      />
      <KakaoAdFitSlot
        className="kakao-adfit-pc-fixed-banner"
        adUnit={KAKAO_ADFIT_PC_BOTTOM_UNIT}
        width={728}
        height={90}
        slot="pc_bottom_fixed"
      />
      <KakaoAdFitSlot
        className="kakao-adfit-side-banner kakao-adfit-side-banner-left"
        adUnit={KAKAO_ADFIT_SIDE_UNIT}
        width={160}
        height={600}
        slot="pc_left_side"
      />
    </>
  );
}

export function KakaoAdFitMobileTopBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  useKakaoAdFitScript(enabled);

  if (!enabled) return null;

  return (
    <KakaoAdFitSlot
      className="kakao-adfit-mobile-top-banner"
      adUnit={KAKAO_ADFIT_MOBILE_TOP_UNIT}
      width={320}
      height={100}
      slot="mobile_top"
    />
  );
}

export function KakaoAdFitMobileMidBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  useKakaoAdFitScript(enabled);

  if (!enabled) return null;

  return (
    <KakaoAdFitSlot
      className="kakao-adfit-mobile-mid-banner"
      adUnit={KAKAO_ADFIT_MOBILE_MID_UNIT}
      width={320}
      height={50}
      slot="mobile_mid"
    />
  );
}

export function KakaoAdFitPcTopTripleBanner({ enabled }: KakaoAdFitFixedBannerProps) {
  useKakaoAdFitScript(enabled);

  if (!enabled) return null;

  return (
    <aside className="kakao-adfit-pc-top-row" aria-label="광고">
      {KAKAO_ADFIT_PC_TOP_UNITS.map((adUnit, index) => (
        <KakaoAdFitIns
          key={adUnit}
          adUnit={adUnit}
          width={300}
          height={250}
          slot={`pc_top_${index + 1}`}
        />
      ))}
    </aside>
  );
}
