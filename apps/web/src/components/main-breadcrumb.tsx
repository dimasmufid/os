"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function toTitleCase(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MainBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const segments = parts.map((segment, index) => ({
    label: toTitleCase(segment),
    href: `/${parts.slice(0, index + 1).join("/")}`,
  }));

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <Fragment key={segment.href}>
            <BreadcrumbItem>
              {index < segments.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={segment.href}>{segment.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="line-clamp-1">
                  {segment.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < segments.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
