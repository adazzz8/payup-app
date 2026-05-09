import { create } from "zustand";

type QueueStore = {
  pendingCount: number;
  setPendingCount: (count: number) => void;
};

export const useQueueStore = create<QueueStore>((set) => ({
  pendingCount: 3,
  setPendingCount: (count) => set({ pendingCount: count }),
}));
