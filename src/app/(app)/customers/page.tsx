import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

export default function CustomersPage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="לקוחות" subtitle="אנשים ועסקים עם חובות פתוחים" />
      <PlaceholderListCard title="מקום שמור ללקוחות" description="כרטיסי לקוחות, חיפוש וסינון יוצגו כאן." />
    </div>
  );
}
