import { NavLink, Outlet } from "react-router";

type PageModule = { default: React.ComponentType };

const pageModules = import.meta.glob<PageModule>(
  "../designs/subframe/pages/*.tsx",
  { eager: true }
);

const toSlug = (path: string): string =>
  path.replace(/^.*\//, "").replace(/\.tsx$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

const toLabel = (path: string): string =>
  path.replace(/^.*\//, "").replace(/\.tsx$/, "")
    .replace(/^Nabu/, "");

export const designPages = Object.entries(pageModules).map(
  ([path, mod]) => ({
    slug: toSlug(path),
    label: toLabel(path),
    Component: mod.default,
  })
);

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1 rounded text-sm ${isActive ? "bg-brand-100 text-brand-700" : "text-neutral-600 hover:text-neutral-900"}`;

export default function DesignsLayout() {
  return (
    <div className="flex h-screen w-full flex-col">
      <nav className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2">
        {designPages.map(({ slug, label }) => (
          <NavLink key={slug} to={`/designs/${slug}`} className={navLinkClass}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
