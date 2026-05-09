import { ScreenHeader } from "@/components/layout/screen-header";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";

export default function SendQueuePage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="רשימת שליחה" subtitle="בקשות תשלום ותזכורות שממתינות לשליחה" />
      <PlaceholderListCard title="מקום שמור לרשימת שליחה" description="כאן יופיעו פריטים שממתינים לשליחת הודעת תשלום/תזכורת." />
    </div>
  );
}
