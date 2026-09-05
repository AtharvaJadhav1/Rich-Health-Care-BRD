"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { homeHref } from "@/components/home-redirect";
import { MemberMenu } from "@/components/member-menu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/lib/member-status";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/business", label: "Business" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

const staffLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/members", label: "Members" },
];

export function SiteHeader() {
  const { member, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/kyc") ||
    pathname.startsWith("/pins") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/tree") ||
    pathname.startsWith("/genealogy") ||
    pathname.startsWith("/ewallet") ||
    pathname.startsWith("/income") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/verify-pin");

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="mx-auto flex h-[4.75rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-[5.25rem] sm:px-6">
        <Link href={homeHref(member)} className="flex shrink-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Rich Health Care Ayurveda"
            className="size-12 rounded-full object-cover ring-2 ring-primary/20 sm:size-14"
          />
          <span className="font-heading hidden text-base font-semibold leading-tight text-foreground sm:block sm:text-lg">
            Rich Health Care Ayurveda
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {!member
            ? publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={pathname === link.href ? "nav-link-active" : "nav-link"}
                >
                  {link.label}
                </Link>
              ))
            : member.role === "MEMBER"
              ? (
                  <Link
                    href="/dashboard"
                    className={pathname.startsWith("/dashboard") ? "nav-link-active" : "nav-link"}
                  >
                    Dashboard
                  </Link>
                )
              : staffLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={pathname.startsWith(link.href) ? "nav-link-active" : "nav-link"}
                  >
                    {link.label}
                  </Link>
                ))}
        </nav>

        <div className="flex items-center gap-2">
          {!member ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Login
              </Link>
              <Link href={isApp ? "/login" : "/register"} className={buttonVariants({ size: "sm" })}>
                Register
              </Link>
            </div>
          ) : null}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="size-10" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-1 overflow-y-auto p-6">
              <p className="section-eyebrow mb-2">Menu</p>
              {member && member.role === "MEMBER" ? (
                <MemberMenu onNavigate={closeMenu} />
              ) : member && isStaffRole(member.role) ? (
                <div className="space-y-1">
                  {staffLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 text-base transition-colors",
                        pathname.startsWith(link.href)
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2.5 text-base hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-col gap-2 pt-6">
                {member ? (
                  <Button
                    onClick={() => {
                      closeMenu();
                      logout();
                      router.push("/");
                    }}
                  >
                    Sign out
                  </Button>
                ) : (
                  <>
                    <Link href="/login" onClick={closeMenu} className={buttonVariants({ variant: "outline" })}>
                      Login
                    </Link>
                    <Link
                      href={isApp ? "/login" : "/register"}
                      onClick={closeMenu}
                      className={buttonVariants()}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
