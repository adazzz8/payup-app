import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

type DebtDetailsPageProps = {
  params: Promise<{
    debtId: string;
  }>;
};

export default async function DebtDetailsPage({ params }: DebtDetailsPageProps) {
  const { debtId } = await params;

  return (
    <div className="space-y-4">
      <ScreenHeader title="פרטי חוב" subtitle={`מזהה חוב: ${debtId}`} />
      <PlaceholderListCard title="מקום שמור לציר זמן חוב" description="היסטוריית תשלומים, תזכורות ולוג הודעות יוצגו כאן." />
    </div>
  );
}
