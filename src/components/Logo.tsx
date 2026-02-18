interface LogoProps {
  className?: string;
  /** When false (collapsed sidebar), render a compact version */
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const heightMap = {
  sm: "h-6",
  md: "h-8",
  lg: "h-10",
};

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  // Collapsed sidebar: show nothing (company name appears below as context)
  if (!showText) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src="/logo.svg"
          alt="Honey Lake Clinic"
          className={`${heightMap[size]} w-auto`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/logo.svg"
        alt="Honey Lake Clinic"
        className={`${heightMap[size]} w-auto`}
      />
    </div>
  );
}
