import { ScreenHeader } from "@/components/layout/screen-header";
import { StatCard } from "@/components/domain/dashboard/stat-card";
import { PlaceholderListCard } from "@/components/domain/shared/placeholder-list-card";
import { HomeShortcuts } from "@/components/domain/home/home-shortcuts";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="דשבורד" subtitle="תמונת מצב של תזרים וחובות" />
      <section className="grid grid-cols-1 gap-3">
        <StatCard label="שולם החודש" value="₪0" tone="success" />
        <StatCard label="כסף בחוץ" value="₪0" tone="warning" />
        <StatCard label="סה״כ חודשי משולב" value="₪0" tone="neutral" />
      </section>
      <section className="grid grid-cols-2 gap-3">
        <StatCard label="חודש קודם" value="₪0" tone="neutral" compact />
        <StatCard label="ממוצע חודשי" value="₪0" tone="neutral" compact />
        <StatCard label="מספר עסקאות" value="0" tone="neutral" compact />
        <StatCard label="עסקה ממוצעת" value="₪0" tone="neutral" compact />
      </section>
      <HomeShortcuts pendingQueueCount={3} />
      <PlaceholderListCard title="פיד חובות" description="כרטיסי חוב יציגו הודעה אחרונה ומספר תזכורות שנשלחו." />
    </div>
  );
}
