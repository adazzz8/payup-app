type PlaceholderListCardProps = {
  title: string;
  description: string;
};

export function PlaceholderListCard({ title, description }: PlaceholderListCardProps) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-surface p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </section>
  );
}
