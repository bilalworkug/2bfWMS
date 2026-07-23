interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Two Brothers Food Complex PLC"
      height={size}
      className={`w-auto ${className}`}
      style={{ objectFit: "contain", maxHeight: size }}
    />
  );
}
