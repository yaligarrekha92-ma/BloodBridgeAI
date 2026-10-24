"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/about";

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <Navigation>{children}</Navigation>;
}
