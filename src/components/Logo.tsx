import { BookOpen } from "lucide-react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", showText = true, size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="gradient-primary rounded-lg p-1.5 shadow-md">
        <BookOpen className={`${sizeClasses[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`font-bold ${textSizes[size]} text-foreground`}>
          Bible<span className="text-gradient">OS</span>
        </span>
      )}
    </div>
  );
}
