'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AdminShellContextValue = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  isMobile: boolean;
  setIsMobile: (v: boolean) => void;
};

const LG_BREAKPOINT = 1024;

const defaultValue: AdminShellContextValue = {
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
  isMobile: false,
  setIsMobile: () => {},
};

export const AdminShellContext = createContext<AdminShellContextValue>(defaultValue);

export function AdminShellProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateIsMobile = () => {
      setIsMobile(window.innerWidth < LG_BREAKPOINT);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  const value = useMemo<AdminShellContextValue>(
    () => ({
      collapsed,
      setCollapsed,
      mobileOpen,
      setMobileOpen,
      isMobile,
      setIsMobile,
    }),
    [collapsed, mobileOpen, isMobile]
  );

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell(): AdminShellContextValue {
  return useContext(AdminShellContext);
}
