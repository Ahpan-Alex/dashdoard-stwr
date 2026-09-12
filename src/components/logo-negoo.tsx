import {
  LOGO_NEGOO_GREEN,
  LOGO_NEGOO_NAME,
  LOGO_NEGOO_TAGLINE,
} from "@/lib/brand";

export type LogoNegooTone = "auto" | "onLight" | "onDark";
export type LogoNegooVariant = "full" | "mark";

type LogoNegooProps = {
  className?: string;
  /** `full` : icône + wordmark (+ signature). `mark` : icône seule. */
  variant?: LogoNegooVariant;
  showTagline?: boolean;
  /**
   * `onLight` : wordmark vert marque (carte claire).
   * `onDark` : textes clairs (fond sombre).
   * `auto` : suit `prefers-color-scheme` et les classes `.dark` / `[data-theme=dark]`.
   */
  tone?: LogoNegooTone;
};

function ExchangeArrows() {
  return (
    <g
      fill="none"
      stroke="#fff"
      strokeWidth="4.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M29 18.5 L16 26 L29 33.5" />
      <path d="M18.5 26 H48" />
      <path d="M35 30.5 L48 38 L35 45.5" />
      <path d="M45.5 38 H16" />
    </g>
  );
}

function LogoNegooMarkSvg({
  className,
  labelled = false,
}: {
  className?: string;
  labelled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role={labelled ? "img" : "presentation"}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? LOGO_NEGOO_NAME : undefined}
    >
      <rect width="64" height="64" rx="15" fill={LOGO_NEGOO_GREEN} />
      <ExchangeArrows />
    </svg>
  );
}

/** Icône Négoo seule (en-tête, favicon, documents). */
export function LogoNegooMark({ className = "" }: { className?: string }) {
  return <LogoNegooMarkSvg className={className} labelled />;
}

/**
 * Logo Négoo officiel : icône (flèches d’échange) + wordmark + signature.
 * Statique : ne pas envelopper d’un lien sur les écrans d’authentification.
 */
export function LogoNegoo({
  className = "",
  variant = "full",
  showTagline = true,
  tone = "auto",
}: LogoNegooProps) {
  if (variant === "mark") {
    return <LogoNegooMark className={className} />;
  }

  const label = showTagline
    ? `${LOGO_NEGOO_NAME} — ${LOGO_NEGOO_TAGLINE}`
    : LOGO_NEGOO_NAME;

  const viewBox = showTagline ? "0 0 400 108" : "0 0 280 80";

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      data-tone={tone}
      className={`negoo-logo h-auto select-none ${className}`.trim()}
      role="img"
      aria-label={label}
    >
      <rect x="0" y="14" width="80" height="80" rx="18.75" fill={LOGO_NEGOO_GREEN} />
      <g transform="translate(0 14) scale(1.25)">
        <ExchangeArrows />
      </g>
      <text
        x="96"
        y="62"
        className="negoo-logo-wordmark"
        fill="var(--logo-wordmark)"
        fontFamily="var(--font-manrope), Manrope, ui-sans-serif, sans-serif"
        fontSize="44"
        fontWeight="700"
        letterSpacing="-0.04em"
      >
        {LOGO_NEGOO_NAME}
      </text>
      {showTagline ? (
        <text
          x="96"
          y="86"
          className="negoo-logo-tagline"
          fill="var(--logo-tagline)"
          fontFamily="var(--font-manrope), Manrope, ui-sans-serif, sans-serif"
          fontSize="11"
          fontWeight="500"
          letterSpacing="0.16em"
        >
          {LOGO_NEGOO_TAGLINE.toUpperCase()}
        </text>
      ) : null}
    </svg>
  );
}
