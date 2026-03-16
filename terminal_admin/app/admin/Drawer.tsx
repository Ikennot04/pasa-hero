"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LiaBarsSolid } from "react-icons/lia";
import { FaBell, FaChartLine } from "react-icons/fa";
import { MdBusAlert } from "react-icons/md";
import { TbBusStop } from "react-icons/tb";
import { LuLogs } from "react-icons/lu";

const routes = [
  {
    path: "/admin/dashboard",
    icon: <FaChartLine className="size-6" />,
    label: "Dashboard",
  },
  {
    path: "/admin/management",
    icon: <MdBusAlert className="size-6" />,
    label: "Arrival & Departure",
  },
  {
    path: "/admin/logs",
    icon: <LuLogs className="size-6" />,
    label: "Terminal Logs",
  },
  {
    path: "/admin/bus",
    icon: <TbBusStop className="size-6" />,
    label: "Bus Status",
  },
  {
    path: "/admin/notifications",
    icon: <FaBell className="size-6" />,
    label: "Notifications",
  },
];

export default function Drawer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex min-h-screen flex-col">
        <nav className="navbar w-full shrink-0 bg-base-300">
          <label
            htmlFor="my-drawer-4"
            aria-label="open sidebar"
            className="btn btn-square btn-ghost"
          >
            <LiaBarsSolid className="size-6" />
          </label>
          <div className="pl-3 text-xl font-semibold">Terminal Admin</div>
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
            {routes.map((route) => {
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
