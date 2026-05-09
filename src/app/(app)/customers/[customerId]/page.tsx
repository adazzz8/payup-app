import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

type CustomerDetailsPageProps = {
  params: Promise<{
    customerId: string;
  }>;
};

export default async function CustomerDetailsPage({ params }: CustomerDetailsPageProps) {
  const { customerId } = await params;

  return (
    <div className="space-y-4">
      <ScreenHeader title="פרטי לקוח" subtitle={`מזהה לקוח: ${customerId}`} />
      <PlaceholderListCard title="מקום שמור לסיכום לקוח" description="מצב חוב מצטבר, תזכורות ודפוסי תשלום יוצגו כאן." />
    </div>
  );
}
