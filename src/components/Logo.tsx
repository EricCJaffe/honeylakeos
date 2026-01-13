import { BookOpen } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="bg-primary rounded-md p-1.5">
        <BookOpen className={`${sizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`font-semibold ${textSizes[size]} text-foreground`}>
          BusinessOS
        </span>
      )}
    </div>
  );
}
