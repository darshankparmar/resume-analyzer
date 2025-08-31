import { FileText, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
            {/* Hero */}
            <header className="relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]" />
                <div className="container mx-auto px-4 py-16 sm:py-24 relative">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600 backdrop-blur">
                            <Shield className="h-3.5 w-3.5 text-blue-600" /> Secure & Private
                        </div>
                        <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
                            Analyze resumes with clarity.
                        </h1>
                        <p className="mt-4 text-lg sm:text-xl text-slate-600">
                            Upload a resume, add job details, and get a concise. Fast. Accurate. Human-friendly.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-3">
                            <Link
                                to="/individual"
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-white shadow-sm hover:bg-slate-800"
                            >
                                Go to Individual Analysis
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                            <Link to="/hr" className="inline-flex items-center justify-center rounded-xl border px-5 py-3 text-slate-700 hover:bg-white">
                                Open HR Portal
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features */}
            <main className="container mx-auto px-4 pt-0 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Upload PDFs</h3>
                        <p className="mt-2 text-sm text-slate-600">Drag and drop a resume. We handle parsing and formatting for you.</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <Sparkles className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Smart insights</h3>
                        <p className="mt-2 text-sm text-slate-600">Concise report with a clear score, strengths, gaps, and tailored tips.</p>
                    </div>
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <Shield className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">Private by default</h3>
                        <p className="mt-2 text-sm text-slate-600">Your data stays secure and is used only to generate your report.</p>
                    </div>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                    <div className="text-slate-800">
                        <h4 className="text-xl font-semibold">HR? Run batch analysis</h4>
                        <p className="mt-1 text-sm text-slate-600">Analyze multiple resumes with HR-specific focus and questions.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/hr" className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                            Open HR Portal
                        </Link>
                        <Link to="/individual" className="inline-flex items-center rounded-xl border px-4 py-2 text-slate-700 hover:bg-white">
                            Individual
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
