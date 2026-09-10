"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
    { href: "/", label: "Home" },
    { href: "/ask", label: "Ask" },
    { href: "/search", label: "Search" },
    { href: "/documents", label: "Documents" },
];

export function Nav() {
    const pathname = usePathname();

    return (
        <nav className="border-b border-stone-200">
            <div className="mx-auto flex max-w-6xl items-center gap-1 px-6">
                <span className="mr-4 text-sm font-medium tracking-tight text-stone-950">
                    Jarvis
                </span>
                {LINKS.map((link) => {
                    const active = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`relative px-4 py-4 text-sm transition ${
                                active
                                    ? "font-medium text-stone-950"
                                    : "text-stone-500 hover:text-stone-800"
                            }`}
                        >
                            {link.label}
                            {active && (
                                <span className="absolute inset-x-3 -bottom-px h-px bg-stone-950" />
                            )}
                        </Link>
                    );
                })}

                <ThemeToggle />
            </div>
        </nav>
    );
}
