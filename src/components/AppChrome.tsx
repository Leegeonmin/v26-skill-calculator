import type { ReactNode } from "react";

type IconName = "trophy" | "calculator" | "sparkles" | "flame" | "notice" | "google";

export function IconGlyph({ name, className = "" }: { name: IconName; className?: string }) {
  if (name === "trophy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M8 4h8v2h3v2a5 5 0 0 1-5 5h-.35A6 6 0 0 1 13 15.92V18h3v2H8v-2h3v-2.08A6 6 0 0 1 10.35 13H10a5 5 0 0 1-5-5V6h3V4Zm-1 4a3 3 0 0 0 3 3V8H7Zm10 3a3 3 0 0 0 3-3h-3v3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 4v3h10V7H7Zm2 6H7v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2ZM9 17H7v2h2v-2Zm4 0h-2v2h2v-2Zm4 0h-2v2h2v-2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "sparkles") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="m12 3 1.75 4.25L18 9l-4.25 1.75L12 15l-1.75-4.25L6 9l4.25-1.75L12 3Zm6 10 1 2.5L21.5 16 19 17l-1 2.5L17 17l-2.5-1 2.5-.5 1-2.5ZM6 14l.8 1.7L8.5 16l-1.7.8L6 18.5l-.8-1.7L3.5 16l1.7-.3L6 14Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "flame") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M13.5 2s.5 2.5-1 4.5C11 8.5 8 9.5 8 14a4 4 0 0 0 8 0c0-2.5-1.5-4-2.5-5.5C12 6.5 13.5 2 13.5 2Zm-1 8.5c1 1 2.5 2.2 2.5 4.5a3 3 0 1 1-6 0c0-2.77 1.86-3.84 3.5-4.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "notice") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9.7L5 21v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4v2h10V8H7Zm0 4v2h7v-2H7Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type AppChromeProps = {
  children: ReactNode;
};

export default function AppChrome({ children }: AppChromeProps) {
  return <div className="app-body">{children}</div>;
}
