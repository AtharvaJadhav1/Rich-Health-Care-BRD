import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="glass-footer mt-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="font-heading text-lg font-semibold">Rich Health Care Ayurveda</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ayurvedic wellness products — juices, powders, oils, and personal care from Padgha, Bhiwandi.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/about">
              About
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/business">
              Business
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/products">
              Products
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/contact">
              Contact
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/register">
              Register
            </Link>
            <Link className="text-muted-foreground transition-colors hover:text-primary" href="/login">
              Login
            </Link>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Rich Health Care Ayurveda. All rights reserved.</p>
          <p>Padgha, Bhiwandi · 421101</p>
        </div>
      </div>
    </footer>
  );
}
