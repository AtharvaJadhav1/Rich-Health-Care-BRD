"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/business", label: "Business" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

const pinLinks = [
  { href: "/pins/generate", label: "Pin Generate" },
  { href: "/pins/transfer", label: "Pin Transfer" },
  { href: "/pins/used", label: "Pin Used" },
  { href: "/pins/unused", label: "Pin Unused" },
];

function kycBadge(status?: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

export function SiteHeader() {
  const { member, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isApp =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/kyc") ||
    pathname.startsWith("/pins") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/tree");

  const memberLinks = member
    ? [
        ...publicLinks,
        { href: "/dashboard", label: "Dashboard" },
        { href: "/kyc", label: "KYC" },
        { href: "/profile", label: "Profile" },
        { href: "/tree", label: "Tree" },
        ...(member.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : publicLinks;

  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="mx-auto flex h-[4.75rem] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-[5.25rem] sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
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
          {memberLinks.slice(0, publicLinks.length).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "nav-link-active" : "nav-link"}
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
          ) : (
            <Link
              href="/dashboard"
              className={cn(
                "hidden rounded-full px-3 py-1.5 text-sm font-medium sm:inline-flex",
                pathname.startsWith("/dashboard") ? "nav-link-active" : "nav-link",
              )}
            >
              Dashboard
            </Link>
          )}

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="size-10" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-1 p-6">
              <p className="section-eyebrow mb-4">Menu</p>
              {memberLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-base transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  {link.label}
                  {link.href === "/kyc" && member ? (
                    <Badge
                      variant={member.kycStatus === "VERIFIED" ? "default" : "secondary"}
                      className="ml-2 h-5 px-1.5 text-[10px]"
                    >
                      {kycBadge(member.kycStatus)}
                    </Badge>
                  ) : null}
                </Link>
              ))}
              {member && member.role !== "ADMIN" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg px-3 py-2.5 text-base hover:bg-muted">
                    PIN <ChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {pinLinks.map((link) => (
                      <DropdownMenuItem key={link.href} onClick={() => router.push(link.href)}>
                        {link.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              <div className="mt-auto flex flex-col gap-2 pt-6">
                {member ? (
                  <Button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                  >
                    Sign out
                  </Button>
                ) : (
                  <>
                    <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                      Login
                    </Link>
                    <Link href={isApp ? "/login" : "/register"} className={buttonVariants()}>
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
