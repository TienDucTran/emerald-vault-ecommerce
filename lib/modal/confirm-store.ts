'use client';
import * as React from 'react';
import { create } from 'zustand';

export type ConfirmVariant = 'default' | 'danger';
export type ConfirmIcon = 'warning' | 'danger' | 'info' | 'none';

export interface ConfirmOptions {
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIcon;
}

export interface ConfirmDialogState {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  show: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  show: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // Nếu trước đó còn một promise chưa được resolve (vd. mở confirm mới
      // trong lúc confirm cũ chưa đóng), giải quyết nó về false để tránh treo caller.
      const pending = get().resolve;
      if (pending) pending(false);
      set({ open: true, options, resolve });
    });
  },
  close: (result: boolean) => {
    const { resolve } = get();
    set({ open: false, options: null, resolve: null });
    if (resolve) resolve(result);
  },
}));
