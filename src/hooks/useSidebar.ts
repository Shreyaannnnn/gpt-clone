"use client";

import { useState, useCallback } from "react";

export function useSidebar() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0]?.clientX || 0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0]?.clientX || 0);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      setMobileMenuOpen(false);
    } else if (isRightSwipe) {
      setMobileMenuOpen(true);
    }
  }, [touchStart, touchEnd]);

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    showSearch,
    setShowSearch,
    mobileMenuOpen,
    setMobileMenuOpen,
    touchStart,
    touchEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
