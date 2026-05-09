import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

export default function ReceiptsPage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="קבלות" subtitle="אישורי תשלום שממתינים לבדיקה" />
      <PlaceholderListCard title="מקום שמור לקבלות" description="קבלות שהועלו וממתינות לאימות יוצגו כאן." />
    </div>
  );
}
