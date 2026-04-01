"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Package,
  Building2,
  Users,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Wrench,
  FileStack,
  GraduationCap,
  Receipt,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { SidebarUserFooter } from "@/components/layout/sidebar-user-footer";

interface NavItem {
  labelKey: string;
  href?: string;
  icon: React.ElementType;
  roles?: string[];
  children?: NavItem[];
}

/** Partner sidebar order: Inicio → Clientes → Ingeniería → Proyectos → Cotizaciones → Ventas → Inventario → Documentos → Capacitación → Reportes → Configuración */
const navigation: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.clients", href: "/clients", icon: Building2 },
  { labelKey: "nav.engineering", href: "/engineering", icon: Wrench },
  { labelKey: "nav.projects", href: "/projects", icon: FolderOpen },
  { labelKey: "nav.quotes", href: "/quotes", icon: FileText },
  {
    labelKey: "nav.sales",
    icon: ShoppingCart,
    roles: ["org_admin", "sales_user", "technical_user", "viewer"],
    children: [
      { labelKey: "nav.sales.list", href: "/sales", icon: ShoppingCart },
      { labelKey: "nav.sales.statements", href: "/sales/statements", icon: Receipt },
    ],
  },
  { labelKey: "nav.inventory", href: "/inventory", icon: Package },
  { labelKey: "nav.documents", href: "/documents", icon: FileStack },
  { labelKey: "nav.training", href: "/training", icon: GraduationCap },
  { labelKey: "nav.reports", href: "/reports", icon: BarChart3, roles: ["SUPERADMIN", "org_admin", "sales_user"] },
  {
    labelKey: "nav.settings",
    icon: Settings,
    roles: ["SUPERADMIN", "org_admin"],
    children: [
      { labelKey: "nav.settings.overview", href: "/settings", icon: Settings },
      { labelKey: "nav.settings.profile", href: "/profile", icon: User },
      { labelKey: "nav.team", href: "/settings/team", icon: Users },
    ],
  },
];

interface SidebarProps {
  role: string;
  /** Footer: signed-in user full name (fallback email). */
  userDisplayName?: string | null;
  /** Footer avatar availability to avoid 404 image requests. */
  hasAvatar?: boolean;
  /** Profile page for footer block. */
  profileHref?: string;
  /** Per-partner module visibility (global + override already resolved). */
  moduleVisibility?: {
    dashboard?: boolean;
    clients?: boolean;
    engineering?: boolean;
    projects?: boolean;
    quotes?: boolean;
    sales?: boolean;
    inventory?: boolean;
    documents?: boolean;
    training?: boolean;
    reports?: boolean;
    settings?: boolean;
  };
}

function isModuleVisible(moduleVisibility: SidebarProps["moduleVisibility"], href?: string) {
  if (!href) return true;
  if (href === "/dashboard") return moduleVisibility?.dashboard !== false;
  if (href === "/clients") return moduleVisibility?.clients !== false;
  if (href === "/engineering") return moduleVisibility?.engineering !== false;
  if (href === "/projects") return moduleVisibility?.projects !== false;
  if (href === "/quotes") return moduleVisibility?.quotes !== false;
  if (href === "/sales" || href.startsWith("/sales/")) return moduleVisibility?.sales !== false;
  if (href === "/inventory") return moduleVisibility?.inventory !== false;
  if (href === "/documents") return moduleVisibility?.documents !== false;
  if (href === "/training") return moduleVisibility?.training !== false;
  if (href === "/reports") return moduleVisibility?.reports !== false;
  if (href === "/settings" || href.startsWith("/settings/")) return moduleVisibility?.settings !== false;
  return true;
}

/** Avoid marking "Ventas" active on account-statements routes; sale detail URLs stay under Ventas. */
function isNavLinkActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/sales") {
    if (pathname.startsWith("/sales/statements")) return false;
    return pathname.startsWith("/sales/");
  }
  return pathname.startsWith(`${href}/`);
}

export function Sidebar({ role, userDisplayName, hasAvatar, profileHref, moduleVisibility }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (pathname.startsWith("/sales")) {
      setExpanded((prev) => (prev.includes("nav.sales") ? prev : [...prev, "nav.sales"]));
    }
  }, [pathname]);

  const toggle = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((l) => l !== key) : [...prev, key]
    );
  };

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(role);
  };

  return (
    <div className="flex h-full w-64 flex-shrink-0 flex-col border-r border-header-foreground/10 bg-header">
      {/* Logo row: h-12 matches TopBar */}
      <div className="box-border flex h-12 flex-shrink-0 items-center justify-center border-b border-header-foreground/10 px-3 py-0.5">
        <Link
          href="/dashboard"
          className="flex max-h-full w-full items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-header-foreground/35 focus-visible:ring-offset-2 focus-visible:ring-offset-header"
          aria-label={t("nav.dashboard")}
        >
          <Image
            src="/logo-vbt-white-horizontal.png"
            alt=""
            width={240}
            height={56}
            draggable={false}
            className="max-h-[calc(3rem-0.25rem)] h-auto w-auto max-w-full object-contain object-center select-none [-webkit-user-drag:none]"
            priority
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation
          .filter(canSee)
          .filter((item) => {
            if (item.children?.length) {
              return item.children.some((c) => c.href && isModuleVisible(moduleVisibility, c.href));
            }
            return isModuleVisible(moduleVisibility, item.href);
          })
          .map((item) => {
          if (item.children) {
            const isOpen = expanded.includes(item.labelKey);
            const hasActiveChild = item.children.some(
              (child) => child.href && isNavLinkActive(pathname, child.href)
            );

            return (
              <div key={item.labelKey}>
                <button
                  onClick={() => toggle(item.labelKey)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-left text-[15px] tracking-[-0.02em] transition-colors",
                    hasActiveChild
                      ? "bg-header-foreground/10 text-header-foreground"
                      : "text-header-foreground/75 hover:bg-header-foreground/5 hover:text-header-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{t(item.labelKey)}</span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                {isOpen && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-header-foreground/15 pl-3">
                    {item.children
                      .filter(canSee)
                      .filter((child) => isModuleVisible(moduleVisibility, child.href))
                      .map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
                          child.href && isNavLinkActive(pathname, child.href)
                            ? "bg-header-foreground/10 text-header-foreground"
                            : "text-header-foreground/60 hover:bg-header-foreground/5 hover:text-header-foreground"
                        )}
                      >
                        <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        {t(child.labelKey)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-[15px] font-medium tracking-[-0.02em] transition-colors",
                isNavLinkActive(pathname, item.href!)
                  ? "bg-header-foreground/12 text-header-foreground"
                  : "text-header-foreground/75 hover:bg-header-foreground/5 hover:text-header-foreground"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {userDisplayName?.trim() && profileHref ? (
        <SidebarUserFooter displayName={userDisplayName.trim()} role={role} hasAvatar={hasAvatar} profileHref={profileHref} />
      ) : null}

      {/* Footer */}
      <div className="border-t border-header-foreground/10 px-4 py-4">
        <p className="text-center text-micro text-header-foreground/40">{t("sidebar.footerVersion")}</p>
      </div>
    </div>
  );
}
