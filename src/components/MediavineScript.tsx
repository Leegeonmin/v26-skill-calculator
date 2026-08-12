import { useEffect } from "react";

const MEDIAVINE_SCRIPT_SRC = import.meta.env.VITE_MEDIAVINE_SCRIPT_SRC ?? "";

type MediavineScriptProps = {
  enabled: boolean;
};

export default function MediavineScript({ enabled }: MediavineScriptProps) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>("script[data-v26-mediavine]");
    const scriptSrc = MEDIAVINE_SCRIPT_SRC.trim();

    if (!enabled || !scriptSrc) {
      existingScript?.remove();
      return;
    }

    if (existingScript?.dataset.v26Mediavine === scriptSrc) {
      return;
    }

    existingScript?.remove();

    const script = document.createElement("script");
    script.async = true;
    script.type = "text/javascript";
    script.dataset.v26Mediavine = scriptSrc;
    script.dataset.noptimize = "1";
    script.dataset.cfasync = "false";
    script.src = scriptSrc;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [enabled]);

  return null;
}
