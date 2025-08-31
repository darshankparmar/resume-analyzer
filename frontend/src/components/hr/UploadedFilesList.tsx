import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, FileText, X } from "lucide-react";
import { AnalysisResult, UploadedFile } from "./types";

interface Props {
    files: UploadedFile[];
    results: Record<string, AnalysisResult>;
    fileId: (f: File) => string;
    onRemove: (idx: number) => void;
    onOpenReport: (name: string, report?: string) => void;
    onDownloadMd: (name: string, report?: string) => void;
    onDownloadPdf: (name: string, report?: string) => void;
    cleanName: (name: string) => string;
}

const UploadedFilesList: React.FC<Props> = ({ files, results, fileId, onRemove, onOpenReport, onDownloadMd, onDownloadPdf, cleanName }) => {
    if (files.length === 0) return null;

    return (
        <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <div className="p-6 sm:p-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Uploaded Resumes</h3>
                <div className="space-y-3">
                    {files.map((f, i) => {
                        const key = fileId(f.file);
                        const r = results[key] || (results as any)[f.file.name];
                        const pct = r?.score != null ? Math.max(0, Math.min(100, Math.round(Number(r.score)))) : null;
                        const isAnalyzed = !!r;

                        return (
                            <div key={i} className={`group p-4 rounded-xl border-2 transition-all duration-200 ${f.error
                                ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20'
                                : isAnalyzed
                                    ? r.success
                                        ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
                                        : 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/20'
                                    : 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30 hover:border-blue-300 hover:bg-blue-50/30'
                                }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`p-2 rounded-lg ${f.error
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : isAnalyzed
                                                ? r.success
                                                    ? 'bg-green-100 dark:bg-green-900/30'
                                                    : 'bg-orange-100 dark:bg-orange-900/30'
                                                : 'bg-blue-100 dark:bg-blue-900/30'
                                            }`}>
                                            {f.error ? (
                                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            ) : isAnalyzed ? (
                                                r.success ? (
                                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                                )
                                            ) : (
                                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">{cleanName(f.file.name)}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {pct != null && (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <Progress value={pct} className="h-3" />
                                                </div>
                                                <span className={`text-lg font-bold w-12 text-right ${pct >= 80 ? 'text-green-600 dark:text-green-400' : pct >= 60 ? 'text-blue-600 dark:text-blue-400' : pct >= 40 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'}`}>{pct}%</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            {r?.report && r.success && (
                                                <>
                                                    <Button size="sm" variant="ghost" onClick={() => onOpenReport(f.file.name, r.report)} className="h-9 px-3 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30">
                                                        Report
                                                    </Button>
                                                    <div className="flex">
                                                        <Button size="sm" variant="ghost" onClick={() => onDownloadMd(f.file.name, r.report)} className="h-9 px-2 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 rounded-r-none" title="Download as Markdown">MD</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => onDownloadPdf(f.file.name, r.report)} className="h-9 px-2 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 rounded-l-none border-l" title="Download as PDF">PDF</Button>
                                                    </div>
                                                </>
                                            )}

                                            <Button size="sm" variant="ghost" onClick={() => onRemove(i)} className="h-9 w-9 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {f.error && (
                                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-700 dark:text-red-400">{f.error}</p>
                                    </div>
                                )}

                                {r?.error && !r.success && (
                                    <div className="mt-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                                        <p className="text-sm text-orange-700 dark:text-orange-400">{r.error}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
};

export default UploadedFilesList;
