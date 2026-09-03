import Link from "next/link";
import { Leaf, ShieldCheck, Users } from "lucide-react";
import { ProductSlideshow } from "@/components/product-slideshow";
import { FeatureCard, FeatureGrid, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PageShell width="6xl" className="space-y-10 sm:space-y-14">
      <section className="hero-gradient">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/ayurveda-symbol.jpg"
          alt="Ayurveda — herbal preparation with traditional herbs"
          className="relative z-0 h-[240px] w-full object-cover sm:h-[340px] lg:h-[440px]"
        />
        <div className="relative z-10 border-t border-white/40 bg-card/85 px-5 py-6 backdrop-blur-md sm:px-8 sm:py-8">
          <p className="section-eyebrow">Ayurvedic wellness</p>
          <h1 className="font-heading mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl">
            Welcome to <span className="text-gradient">Rich Health Care Ayurveda</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Traditional herbal products for daily wellness — trusted by distributors across India.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Login
            </Link>
            <Link href="/register" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Register
            </Link>
          </div>
        </div>
      </section>

      <section>
        <ProductSlideshow />
      </section>

      <section className="space-y-6">
        <div className="text-center sm:text-left">
          <p className="section-eyebrow">Why join us</p>
          <h2 className="font-heading mt-2 text-2xl font-semibold sm:text-3xl">Built for distributors</h2>
        </div>
        <FeatureGrid>
          <FeatureCard
            icon={<Leaf className="size-6" />}
            title="Authentic Ayurveda"
            description="Juices, powders, oils, soaps, and personal-care products rooted in traditional herbal science."
          />
          <FeatureCard
            icon={<Users className="size-6" />}
            title="Binary growth plan"
            description="Left and right team structure with transparent matching income and weekly payout reports."
          />
          <FeatureCard
            icon={<ShieldCheck className="size-6" />}
            title="Verified operations"
            description="PAN-based registration, manual payment approval, and admin-reviewed KYC for every member."
          />
        </FeatureGrid>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="glass-panel space-y-4 p-6 sm:p-8">
          <p className="section-eyebrow">Company profile</p>
          <h2 className="font-heading text-xl font-semibold sm:text-2xl">Our mission</h2>
          <p className="leading-relaxed text-muted-foreground">
            Rich Health Care Ayurveda prepares herbal juices, powders, oils, soaps, shampoo, and personal-care
            products from traditional herbs. Our work is rooted in Ayurveda and daily wellness, with products
            supplied across India for retail and distributor partners.
          </p>
          <Link href="/about" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Learn more
          </Link>
        </div>

        <div className="glass-panel space-y-4 p-6 sm:p-8">
          <p className="section-eyebrow">Contact us</p>
          <h2 className="font-heading text-xl font-semibold sm:text-2xl">Reach the desk</h2>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Rich Health Care Ayurveda</p>
            <p>Office No. 2, 1st Floor, Patil Complex, near Maharashtra Bank, Padgha, Bhiwandi, 421101</p>
            <p>
              Mobile:{" "}
              <a className="font-medium text-primary hover:underline" href="tel:9307116704">
                9307116704
              </a>
            </p>
          </div>
          <Link href="/contact" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Send a message
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
