import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Estado de interface (não é dado do usuário: perdê-lo não perde progresso). */
interface UIState {
  /** Títulos revelados nesta sessão, apesar da proteção contra spoilers. */
  revealed: Set<string>;
  reveal: (id: string) => void;
  /** Fases recolhidas na timeline. */
  collapsed: string[];
  togglePhase: (id: string) => void;
  setCollapsed: (ids: string[]) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__afterfall_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => void mem.set(key, value),
      removeItem: (key: string) => void mem.delete(key),
    };
  }
});

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      revealed: new Set(),
      reveal: (id) => set((s) => ({ revealed: new Set(s.revealed).add(id) })),
      collapsed: [],
      togglePhase: (id) =>
        set((s) => ({ collapsed: s.collapsed.includes(id) ? s.collapsed.filter((x) => x !== id) : [...s.collapsed, id] })),
      setCollapsed: (ids) => set({ collapsed: ids }),
    }),
    {
      name: 'afterfall:ui',
      storage: safeStorage,
      partialize: (s) => ({ collapsed: s.collapsed }),
    },
  ),
);
