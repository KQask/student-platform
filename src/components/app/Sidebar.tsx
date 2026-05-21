"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, User, CalendarDays, ListChecks, BookOpen, MessagesSquare,
  Users, Boxes, MessageCircle, Settings, GraduationCap, LogOut, FileUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

const items = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/profile",      label: "Profile",      icon: User },
  { href: "/planner",      label: "Planner",      icon: CalendarDays },
  { href: "/transcript",   label: "Transcript",   icon: FileUp },
  { href: "/requirements", label: "Requirements", icon: ListChecks },
  { href: "/courses",      label: "Courses",      icon: BookOpen },
  { href: "/feed",         label: "Feed",         icon: MessagesSquare },
  { href: "/network",      label: "Network",      icon: Users },
  { href: "/clubs",        label: "Clubs",        icon: Boxes },
  { href: "/messages",     label: "Messages",     icon: MessageCircle },
  { href: "/settings",     label: "Settings",     icon: Settings },
];

export function Sidebar({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <GraduationCap className="text-brand-600" size={22} />
        <span className="font-semibold text-gray-900">Student Platform</span>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 p-3">
        <div className="text-xs text-gray-500 px-2 pb-2">Signed in as</div>
        <div className="text-sm font-medium text-gray-900 px-2 truncate">{userName ?? "—"}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="mt-2 w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
