import { FileText, Menu } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import { Link, NavLink } from "react-router-dom";
import React from "react";

export default function AppHeader() {
    const [open, setOpen] = React.useState(false);
    return (
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-gray-200/50">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <FileText className="h-6 w-6 text-white" />
                        </Link>
                        <div>
                            <Link to="/" className="block text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Resume Analyzer
                            </Link>
                            <p className="text-sm text-gray-600 hidden sm:block">AI-powered resume optimization</p>
                        </div>
                    </div>
                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <NavLink to="/individual" className={({ isActive }) => `transition-colors hover:text-slate-900 ${isActive ? "text-slate-900" : "text-slate-600"}`}>Individual</NavLink>
                        <NavLink to="/hr" className={({ isActive }) => `transition-colors hover:text-slate-900 ${isActive ? "text-slate-900" : "text-slate-600"}`}>HR Portal</NavLink>
                        <UserButton />
                    </nav>

                    {/* Mobile menu button */}
                    <button className="md:hidden inline-flex items-center justify-center rounded-lg border px-3 py-2 text-slate-700" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
                {/* Mobile nav */}
                {open && (
                    <div className="md:hidden mt-3 grid gap-2 rounded-xl border bg-white p-3">
                        <NavLink to="/individual" onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}>Individual</NavLink>
                        <NavLink to="/hr" onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-50"}`}>HR Portal</NavLink>
                        <div className="flex items-center gap-3 px-1 py-1.5">
                            <UserButton />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
