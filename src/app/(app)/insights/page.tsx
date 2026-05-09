import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

export default function InsightsPage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="תובנות" subtitle="ניתוח מגמות פשוט של תזרים וחובות" />
      <PlaceholderListCard title="מקום שמור לתובנות" description="גרפים ומדדי ביצועים יוצגו כאן בהמשך." />
    </div>
  );
}
