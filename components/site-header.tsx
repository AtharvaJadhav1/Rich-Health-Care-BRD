"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Leaf, Menu } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { member, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isApp = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  const links = member
    ? [
        ...publicLinks,
        { href: "/dashboard", label: "Dashboard" },
        ...(member.role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : publicLinks;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          Rich Health Care
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map((link) => (
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
        <div className="hidden items-center gap-2 md:flex">
          {member ? (
            <>
              <span className="text-sm text-muted-foreground">{member.memberCode}</span>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants()}>
                Join
              </Link>
            </>
          )}
        </div>
        <Sheet>
          <SheetTrigger className="md:hidden" render={<Button variant="ghost" size="icon" />}>
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent className="flex flex-col gap-4 p-6">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-lg">
                {link.label}
              </Link>
            ))}
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
              <Link href={isApp ? "/login" : "/register"} className={buttonVariants()}>
                {isApp ? "Sign in" : "Become a distributor"}
              </Link>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
