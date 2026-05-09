import { create } from "zustand";

export type QuickAddDraft = {
  customerName: string;
  productOrService: string;
  amount: string;
  phone: string;
};

type QuickAddStore = {
  draft: QuickAddDraft;
  setField: <K extends keyof QuickAddDraft>(field: K, value: QuickAddDraft[K]) => void;
  reset: () => void;
};

const initialDraft: QuickAddDraft = {
  customerName: "",
  productOrService: "",
  amount: "",
  phone: "",
};

export const useQuickAddStore = create<QuickAddStore>((set) => ({
  draft: initialDraft,
  setField: (field, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    })),
  reset: () =>
    set({
      draft: initialDraft,
    }),
}));
