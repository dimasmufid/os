"use client";

import * as React from "react";
import {
  Book,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Clock,
  FileEdit,
  Globe,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  Luggage,
  MapPin,
  Music2,
  Palette,
  Settings2,
  Sparkles,
  Target,
  Users,
  User,
  Wallet,
  Wrench,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavWorkspaces } from "@/components/nav-workspaces";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Home",
      url: "/home",
      icon: Home,
    },
    {
      title: "Timesheet",
      url: "/timesheet",
      icon: Clock,
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Docs",
      url: "/docs",
      icon: Book,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
    },
  ],
  workspaces: [
    {
      name: "Personal Life Management",
      icon: User,
      pages: [
        {
          name: "Daily Journal & Reflection",
          url: "#",
          icon: BookOpen,
        },
        {
          name: "Health & Wellness Tracker",
          url: "#",
          icon: Heart,
        },
        {
          name: "Personal Growth & Learning Goals",
          url: "#",
          icon: Sparkles,
        },
      ],
    },
    {
      name: "Professional Development",
      icon: Briefcase,
      pages: [
        {
          name: "Career Objectives & Milestones",
          url: "#",
          icon: Target,
        },
        {
          name: "Skill Acquisition & Training Log",
          url: "#",
          icon: GraduationCap,
        },
        {
          name: "Networking Contacts & Events",
          url: "#",
          icon: Users,
        },
      ],
    },
    {
      name: "Creative Projects",
      icon: Palette,
      pages: [
        {
          name: "Writing Ideas & Story Outlines",
          url: "#",
          icon: FileEdit,
        },
        {
          name: "Art & Design Portfolio",
          url: "#",
          icon: Palette,
        },
        {
          name: "Music Composition & Practice Log",
          url: "#",
          icon: Music2,
        },
      ],
    },
    {
      name: "Home Management",
      icon: Building2,
      pages: [
        {
          name: "Household Budget & Expense Tracking",
          url: "#",
          icon: Wallet,
        },
        {
          name: "Home Maintenance Schedule & Tasks",
          url: "#",
          icon: Wrench,
        },
        {
          name: "Family Calendar & Event Planning",
          url: "#",
          icon: Calendar,
        },
      ],
    },
    {
      name: "Travel & Adventure",
      icon: Luggage,
      pages: [
        {
          name: "Trip Planning & Itineraries",
          url: "#",
          icon: MapPin,
        },
        {
          name: "Travel Bucket List & Inspiration",
          url: "#",
          icon: Globe,
        },
        {
          name: "Travel Journal & Photo Gallery",
          url: "#",
          icon: Camera,
        },
      ],
    },
  ],
};

export function SidebarLeft({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" collapsible="icon" {...props}>
      <SidebarHeader>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavWorkspaces workspaces={data.workspaces} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
