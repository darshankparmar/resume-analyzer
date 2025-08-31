import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Download } from "lucide-react";

interface Props {
    filesCount: number;
    maxFiles: number;
    maxSizeMb: number;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled: boolean;
    analyzedCount: number;
    successfulCount: number;
    avgScore: number | null;
    totalFiles: number;
    onDownloadAllMd: () => void;
    onDownloadAllPdf: () => void;
}

const ResumeUploadSection: React.FC<Props> = ({
    filesCount,
    maxFiles,
    maxSizeMb,
    onFileChange,
    disabled,
    analyzedCount,
    successfulCount,
    avgScore,
    totalFiles,
    onDownloadAllMd,
    onDownloadAllPdf,
}) => {
    return (
        <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                            <Upload className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Upload Resumes</h2>
                    </div>
                    <Badge variant="outline" className="text-slate-600 border-slate-300">
                        {filesCount}/{maxFiles} files
                    </Badge>
                </div>

                <div className="relative">
                    <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={onFileChange}
                        disabled={disabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className={`block border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${disabled
                            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                            : 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-400 cursor-pointer'
                            } dark:border-slate-600 dark:bg-slate-700/30 dark:hover:bg-slate-700/50`}
                    >
                        <Upload className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {disabled ? 'Maximum files reached' : 'Drop PDF resumes here'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm">
                            {disabled
                                ? `You can upload up to ${maxFiles} files`
                                : `or click to browse • PDF only • Max ${maxSizeMb}MB each`}
                        </p>
                    </label>
                </div>

                {(analyzedCount > 0) && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analyzedCount}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Analyzed</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successfulCount}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Successful</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{avgScore || '—'}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Avg Score</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalFiles}</div>
                                    <div className="text-xs text-slate-600 dark:text-slate-400">Total Files</div>
                                </div>
                            </div>

                            {successfulCount > 1 && (
                                <div className="flex justify-center gap-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                                    <Button onClick={onDownloadAllMd} variant="outline" size="sm" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 hover:from-green-700 hover:to-emerald-700 shadow-md flex-1 max-w-[120px]">
                                        <Download className="h-4 w-4 mr-2" />
                                        MD
                                    </Button>
                                    <Button onClick={onDownloadAllPdf} variant="outline" size="sm" className="bg-gradient-to-r from-red-600 to-pink-600 text-white border-0 hover:from-red-700 hover:to-pink-700 shadow-md flex-1 max-w-[120px]">
                                        <Download className="h-4 w-4 mr-2" />
                                        PDF
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default ResumeUploadSection;
