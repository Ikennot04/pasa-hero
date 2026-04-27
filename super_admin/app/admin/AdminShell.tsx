"use client";

import axios from "axios";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { LiaBarsSolid } from "react-icons/lia";
import {
  FaUsers,
  FaChartLine,
  FaBus,
  FaRoute,
  FaBell,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import { TbSteeringWheelFilled } from "react-icons/tb";
import { FaMapLocationDot, FaUserShield } from "react-icons/fa6";

import { useAuthToken } from "../useAuthToken.hook";

const SUPER_ADMIN_ROLE = "super admin";

type NavRoute = {
  path: string;
  icon: ReactNode;
  label: string;
  superAdminOnly?: boolean;
};

const routes: NavRoute[] = [
  {
    path: "/admin/dashboard",
    icon: <FaChartLine className="size-6" />,
    label: "Dashboard",
  },
  { path: "/admin/user", icon: <FaUsers className="size-6" />, label: "Users" },
  {
    path: "/admin/admin-users",
    icon: <FaUserShield className="size-6" />,
    label: "Admin users",
    superAdminOnly: true,
  },
  { path: "/admin/bus", icon: <FaBus className="size-6" />, label: "Buses" },
  {
    path: "/admin/driver",
    icon: <TbSteeringWheelFilled className="size-7" />,
    label: "Drivers",
  },
  {
    path: "/admin/terminal",
    icon: <FaMapLocationDot className="size-6" />,
    label: "Terminals",
  },
  {
    path: "/admin/route",
    icon: <FaRoute className="size-6" />,
    label: "Routes",
  },
  {
    path: "/admin/notification",
    icon: <FaBell className="size-6" />,
    label: "Notifications",
  },
  {
    path: "/admin/profile",
    icon: <FaUser className="size-6" />,
    label: "Profile",
  },
];

const AUTH_TOKEN_KEY = "super_admin_auth_token";
const PROFILE_NAME_KEY = "super_admin_f_name";
const PROFILE_ROLE_KEY = "super_admin_role";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { authToken } = useAuthToken();
  const [profileName, setProfileName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(PROFILE_ROLE_KEY),
  );

  useEffect(() => {
    const name = localStorage.getItem(PROFILE_NAME_KEY) ?? "";
    queueMicrotask(() => setProfileName(name));
  }, []);

  useEffect(() => {
    void (async () => {
      const result = await authToken();
      const role = result?.user?.role;
      if (typeof role === "string") {
        setUserRole(role);
        localStorage.setItem(PROFILE_ROLE_KEY, role);
      }
    })();
  }, [authToken]);

  const visibleRoutes = useMemo(() => {
    return routes.filter(
      (r) => !r.superAdminOnly || userRole === SUPER_ADMIN_ROLE,
    );
  }, [userRole]);

  const setUserInactiveOnLogout = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    if (!token || !baseUrl) return;

    try {
      const { data } = await axios.get<{ data?: { user?: { _id?: string; id?: string } } }>(
        `${baseUrl}/api/users/auth/check`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const user = data?.data?.user;
      const userId = user?._id ?? user?.id;
      if (!userId) return;

      await axios.patch(`${baseUrl}/api/users/auth/logout/${userId}`);
    } catch {
      // Still clear session locally if the API is unreachable.
    }
  };

  const handleLogout = async () => {
    await setUserInactiveOnLogout();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(PROFILE_NAME_KEY);
    localStorage.removeItem(PROFILE_ROLE_KEY);
    router.replace("/login");
  };

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex min-h-screen flex-col">
        <nav className="navbar w-full shrink-0 bg-base-300">
          <div className="navbar-start">
            <label
              htmlFor="my-drawer-4"
              aria-label="open sidebar"
              className="btn btn-square btn-ghost"
            >
              <LiaBarsSolid className="size-6" />
            </label>
            <div className="pl-3 text-xl font-semibold">Pasahero Admin</div>
          </div>
          <div className="navbar-end gap-2 pr-2">
            <span className="hidden max-w-48 truncate text-[#0062CA] font-semibold   sm:inline">
              Admin {profileName || "Admin"}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-lg gap-2"
              onClick={handleLogout}
            >
              <FaSignOutAlt className="size-6" />
              Logout
            </button>
          </div>
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">{children}</div>
      </div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor="my-drawer-4"
          aria-label="close sidebar"
          className="drawer-overlay"
        />
        <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-16 is-drawer-open:w-64 pt-2">
          <ul className="menu w-full grow gap-3 text-base font-semibold">
            {visibleRoutes.map((route) => {
              const isActive = pathname === route.path;
              return (
                <li
                  key={route.path}
                  className={`${isActive ? "border-b-2 border-[#0062CA]" : ""}`}
                >
                  <Link
                    href={route.path}
                    className={`is-drawer-close:tooltip is-drawer-close:tooltip-right ${isActive ? "text-[#0062CA]" : ""}`}
                    data-tip={route.label}
                  >
                    {route.icon}
                    <span className="is-drawer-close:hidden">
                      {route.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
