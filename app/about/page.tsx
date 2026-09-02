export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">About</p>
      <h1 className="font-heading text-4xl font-semibold">A lean binary plan, run with receipts.</h1>
      <p className="text-lg text-muted-foreground">
        Rich Health Care is a wellness direct-selling company. This platform covers the core of the business:
        PAN-verified registration, a left/right tree with auto-spillover, manual payment approval, retail margin,
        and daily matching income with GST and admin cuts.
      </p>
      <p className="text-muted-foreground">
        Rank titles are set by an administrator in this phase — there is no auto-qualification formula yet.
        Extra bonus types, franchise desks, and payment gateways are intentionally out of scope so the pairing
        math stays correct first.
      </p>
      <p className="text-muted-foreground">
        No binary volume and no wallet credit is created until a joining or order payment is approved. That
        guard is the most important rule in the system.
      </p>
    </div>
  );
}
