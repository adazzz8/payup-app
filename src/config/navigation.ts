import type { NavItem } from "@/types/navigation";

export const navItems: NavItem[] = [
  { label: "בית", href: "/", icon: "בית" },
  { label: "לקוחות", href: "/customers", icon: "אנשים" },
  { label: "+", icon: "+", isPrimary: true, action: "openQuickAdd" },
  { label: "קבלות", href: "/receipts", icon: "קבלה" },
  { label: "תובנות", href: "/insights", icon: "מגמה" },
];
