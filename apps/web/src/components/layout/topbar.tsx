"use client";

import { signOut } from "next-auth/react";
import { LogOut, User, Bell } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  SALES: "bg-green-100 text-green-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

export function TopBar({ user }: TopBarProps) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <header className="h-14 bg-vbt-blue border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">{t("topbar.title")}</h1>
        <span className="text-white/40">|</span>
        <span className="text-sm text-white/70">{t("topbar.org")}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Language toggle */}
        <div className="flex items-center rounded-lg border border-white/20 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setLocale("en")}
            className={`px-2.5 py-1.5 transition-colors ${
              locale === "en"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            ENG
          </button>
          <button
            onClick={() => setLocale("es")}
            className={`px-2.5 py-1.5 transition-colors ${
              locale === "es"
                ? "bg-white/20 text-white"
                : "text-white/70 hover:bg-white/10"
            }`}
          >
            ESP
          </button>
        </div>

        <button className="relative p-2 text-white/70 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-tight">
              {user.name ?? user.email}
            </p>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role] ?? "bg-white/20 text-white"}`}
            >
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-2 text-white/70 hover:text-white transition-colors"
          title={t("topbar.signOut")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
