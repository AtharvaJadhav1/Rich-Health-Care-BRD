import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "3xl" | "4xl" | "5xl" | "6xl" | "7xl";

const widthClass: Record<Width, string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

export function PageShell({
  children,
  className,
  width = "6xl",
  narrow = false,
}: {
  children: ReactNode;
  className?: string;
  width?: Width;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-10 sm:px-6 sm:py-14 lg:py-16",
        narrow ? "max-w-md" : widthClass[width],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-10 space-y-4",
        align === "center" && "mx-auto max-w-3xl text-center",
        className,
      )}
    >
      {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
      {children}
    </header>
  );
}

export function GlassPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("glass-panel", className)}>{children}</div>;
}

export function FeatureGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">{children}</div>
  );
}

export function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="glass-panel flex flex-col gap-3 p-5 sm:p-6">
      {icon ? <div className="text-primary">{icon}</div> : null}
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
