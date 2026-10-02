import Link from "next/link";

/** The DigitMonie mark: a rounded shield holding the diamond cluster. Swap for the official SVG when available. */
export function LogoMark({ className = "size-9", inverted = false }: { className?: string; inverted?: boolean }) {
  const shield = inverted ? "#ffffff" : "#0150c8";
  const diamond = inverted ? "#0150c8" : "#ffffff";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M10 6h28c3.3 0 6 2.7 6 6v12.5c0 3-1.2 5.8-3.4 7.9L28.2 44a6 6 0 0 1-8.4 0L7.4 32.4A11 11 0 0 1 4 24.5V12c0-3.3 2.7-6 6-6Z" fill={shield} />
      <g fill={diamond}>
        <rect x="11.2" y="13.2" width="9.6" height="9.6" rx="1.6" transform="rotate(45 16 18)" />
        <rect x="27.2" y="13.2" width="9.6" height="9.6" rx="1.6" transform="rotate(45 32 18)" />
        <rect x="19.2" y="21.2" width="9.6" height="9.6" rx="1.6" transform="rotate(45 24 26)" />
        <rect x="19.6" y="9.6" width="8.8" height="8.8" rx="1.6" transform="rotate(45 24 14)" opacity=".55" />
      </g>
    </svg>
  );
}

export type Logos = { light: string | null; dark: string | null; lightSize?: number; darkSize?: number };

/**
 * The logo lockup. Uses the logo uploaded in Settings → Branding for the background (light, or
 * `inverted` for dark/blue), otherwise the built-in mark and wordmark. With only a light logo on a
 * dark background, it's shown on a white tile.
 */
export function Logo({ href = "/", inverted = false, className = "", logos }: { href?: string; inverted?: boolean; className?: string; logos?: Logos }) {
  const uploaded = inverted ? logos?.dark ?? logos?.light ?? null : logos?.light ?? null;
  const onTile = inverted && !logos?.dark && Boolean(logos?.light);
  // Height set in Settings → Branding; width follows the logo's proportions, capped so wide logos can't break the header.
  const height = (inverted && logos?.dark ? logos.darkSize : logos?.lightSize) ?? 36;
  return (
    <Link href={href} className={`flex items-center gap-2.5 ${className}`} aria-label="DigitMonie home">
      {uploaded ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded logo of unknown size
        <img src={uploaded} alt="DigitMonie" style={{ height, maxWidth: Math.min(240, height * 7) }} className={`w-auto object-contain ${onTile ? "rounded-[5px] bg-white px-2 py-1" : ""}`} />
      ) : (
        <>
          <LogoMark inverted={inverted} />
          <span className={`font-display text-[1.35rem] font-extrabold tracking-tight ${inverted ? "text-white" : "text-brand"}`}>DigitMonie</span>
        </>
      )}
    </Link>
  );
}
