import { PageHero, PageShell } from "@/components/page-shell";

export default function AboutPage() {
  return (
    <PageShell width="3xl">
      <PageHero
        eyebrow="About"
        title="Rich Health Care Solution"
        description="An Ayurveda wellness company bringing traditional herbal products to households and distributor partners across India."
      />
      <div className="glass-panel space-y-5 p-6 leading-relaxed sm:p-8">
        <p className="text-lg text-muted-foreground">
          We are an Ayurveda wellness company. The catalog includes juices, powders, oils, soaps, shampoo, and
          personal care. Distributors join on this platform with PAN, a left/right tree, manual payment
          approval, and matching income with GST and admin cuts.
        </p>
        <p className="text-muted-foreground">
          Rank titles are set by an administrator in this phase. Extra bonus types, franchise desks, and payment
          gateways are out of scope so pairing math stays correct first.
        </p>
        <p className="text-muted-foreground">
          No binary volume and no wallet credit is created until a joining or order payment is approved.
        </p>
      </div>
    </PageShell>
  );
}
