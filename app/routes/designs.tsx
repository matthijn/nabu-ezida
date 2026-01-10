import type { Route } from "./+types/designs";
import { NavLink, Outlet } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Design Preview" }];
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1 rounded text-sm ${isActive ? "bg-brand-100 text-brand-700" : "text-neutral-600 hover:text-neutral-900"}`;

export default function DesignsLayout() {
  return (
    <div className="flex h-screen w-full flex-col">
      <nav className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2">
        <NavLink to="/designs" end className={navLinkClass}>
          Documents
        </NavLink>
        <NavLink to="/designs/documents2" className={navLinkClass}>
          Documents 2
        </NavLink>
        <NavLink to="/designs/documents3" className={navLinkClass}>
          Documents 3
        </NavLink>
        <NavLink to="/designs/codes2" className={navLinkClass}>
          Codes 2
        </NavLink>
      </nav>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
