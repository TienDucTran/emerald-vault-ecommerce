'use client';
import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
  action?: ToastAction;
  durationMs: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, createdAt: Date.now() }],
    }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

type ToastOptions = {
  description?: string;
  action?: ToastAction;
  durationMs?: number;
};

export const toast = {
  info: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({
      variant: 'info',
      message,
      durationMs: opts?.durationMs ?? 4500,
      description: opts?.description,
      action: opts?.action,
    }),
  success: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({
      variant: 'success',
      message,
      durationMs: opts?.durationMs ?? 3500,
      description: opts?.description,
      action: opts?.action,
    }),
  error: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({
      variant: 'error',
      message,
      durationMs: opts?.durationMs ?? 5500,
      description: opts?.description,
      action: opts?.action,
    }),
  warning: (message: string, opts?: ToastOptions) =>
    useToastStore.getState().push({
      variant: 'warning',
      message,
      durationMs: opts?.durationMs ?? 4500,
      description: opts?.description,
      action: opts?.action,
    }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};
