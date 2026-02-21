import type { Metadata } from "next";
import Link from "next/link";

// Icons
import { LiaBarsSolid } from "react-icons/lia";
import { FaChartLine } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Admin | Pasahero",
};

const routes = [
  {
    path: "/admin/dashboard",
    icon: <FaChartLine className="size-6" />,
    label: "Dashboard",
  },
  {
    path: "/admin/users",
    icon: <FaUsers className="size-6" />,
    label: "Users",
  },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {/* Navbar */}
        <nav className="navbar w-full bg-base-300">
          <label
            htmlFor="my-drawer-4"
            aria-label="open sidebar"
            className="btn btn-square btn-ghost"
          >
            <LiaBarsSolid className="size-6" />
          </label>
          <div className="pl-3 text-lg font-semibold">Pasahero Admin</div>
        </nav>
        {/* Page content here */}
        <div className="px-4">{children}</div>
      </div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor="my-drawer-4"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64 pt-2">
          {/* Sidebar content here */}
          <ul className="menu w-full grow gap-2">
            {routes.map((route) => {
              return (
                <li key={route.path}>
                  <Link
                    href={route.path}
                    className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
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
