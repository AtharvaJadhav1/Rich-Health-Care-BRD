import { ProductSlideshow } from "@/components/product-slideshow";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <section className="overflow-hidden rounded-xl border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/branding/ayurveda-symbol.jpg"
          alt="Ayurveda — herbal preparation with traditional herbs"
          className="h-[220px] w-full object-cover sm:h-[320px] lg:h-[420px]"
        />
      </section>

      <section className="mt-5 sm:mt-8">
        <ProductSlideshow />
      </section>

      <section className="mt-8 space-y-6 sm:mt-12">
        <div>
          <h1 className="font-heading text-2xl font-semibold sm:text-4xl">
            Welcome to Rich Health Care Ayurveda
          </h1>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-xl font-semibold sm:text-2xl">Company profile</h2>
          <p className="text-muted-foreground leading-relaxed">
            Rich Health Care Ayurveda is an Ayurvedic wellness company. We prepare herbal juices, powders,
            oils, soaps, shampoo, and personal-care products from traditional herbs. Our work is rooted in
            Ayurveda and daily wellness, with products supplied across India for retail and distributor
            partners.
          </p>
        </div>

        <div className="space-y-3 pb-8">
          <h2 className="font-heading text-xl font-semibold sm:text-2xl">Contact us</h2>
          <div className="space-y-1 text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground">Rich Health Care Ayurveda</p>
            <p>
              Office No. 2, 1st Floor, Patil Complex, near Maharashtra Bank, Padgha, Bhiwandi, 421101
            </p>
            <p>
              Mobile:{" "}
              <a className="text-primary" href="tel:9307116704">
                9307116704
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
