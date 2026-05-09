import { ScreenHeader } from "@/components/layout/screen-header";
import { QuickAddForm } from "@/components/domain/quick-add/quick-add-form";

export default function QuickAddPage() {
  return (
    <div className="space-y-4">
      <ScreenHeader title="הוספה מהירה" subtitle="רישום מהיר בסגנון הודעת וואטסאפ" />
      <QuickAddForm />
    </div>
  );
}
