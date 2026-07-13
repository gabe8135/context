"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function RouteAwareLink({ href, children, ...props }) {
  const pathname = usePathname();
  const targetPath = typeof href === "string" ? href.split("?")[0] : href.pathname;
  if (pathname === targetPath) return null;
  return <Link href={href} {...props}>{children}</Link>;
}
