// Thin wrapper around Google's Material Symbols Outlined font.
// Usage: <Icon name="play_arrow" className="text-[18px]" filled />

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

export function Icon({ name, className = "", filled = false }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}
