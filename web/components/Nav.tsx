"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-logo">
          Resume<span>Genie</span>
        </div>
        <div className="nav-right">
          <div className="view-toggle">
            <Link href="/">
              <button className={clsx("view-btn", { active: pathname === "/" })}>
                Source Bank
              </button>
            </Link>
            <Link href="/runs">
              <button className={clsx("view-btn", { active: pathname === "/runs" })}>
                Runs
              </button>
            </Link>
            <Link href="/tailor">
              <button className={clsx("view-btn", { active: pathname === "/tailor" })}>
                Tailor
              </button>
            </Link>
          </div>
          {pathname === "/" && (
            <ul className="nav-links">
              <li><a href="#skills">Skills</a></li>
              <li><a href="#education">Education</a></li>
              <li><a href="#entries">Entries</a></li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
