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

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
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
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto grid h-[4.75rem] w-full max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-2 px-3 sm:h-24 sm:gap-4 sm:px-4">
        <Link href="/" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Rich Health Care Ayurveda"
            className="size-14 rounded-full object-cover sm:size-[4.5rem]"
          />
        </Link>
        <Link href="/" className="min-w-0 text-center">
          <span className="font-heading block text-sm font-semibold leading-tight sm:text-xl md:text-2xl">
            Rich Health Care Ayurveda
          </span>
        </Link>
        <div className="flex items-center justify-end gap-1">
          <nav className="mr-1 hidden items-center gap-4 text-sm lg:flex">
            {memberLinks.slice(0, 4).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="size-11" />}>
              <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-4 p-6">
              {memberLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-lg">
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
                  <DropdownMenuTrigger className="inline-flex items-center gap-1 text-lg">
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
                    {isApp ? "Login" : "Register"}
                  </Link>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
