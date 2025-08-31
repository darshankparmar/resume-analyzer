import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, FileText, Loader2, X, Upload, Zap, CheckCircle, AlertCircle, Download, Link, Briefcase } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface UploadedFile {
    file: File;
    error?: string;
}

const MAX_FILES = 10;
const MAX_SIZE_MB = 2;
const ALLOWED_TYPE = "application/pdf";

const HRBatchPage: React.FC = () => {
    const [jobTitle, setJobTitle] = useState("");
    const [jobLink, setJobLink] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [hrFocus, setHrFocus] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<Record<string, { name: string; success: boolean; score?: number | null; report?: string; error?: string }>>({});
    const [preview, setPreview] = useState<{ open: boolean; name: string; report: string | null }>(
        { open: false, name: "", report: null }
    );
    const [resumePreview, setResumePreview] = useState<{ open: boolean; name: string; url: string | null }>({ open: false, name: "", url: null });
    const { toast } = useToast();
    const API_BASE = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || "";
    const JD_MAX = 3000;
    const HR_MAX = 500;
    const FOCUS_SUGGESTIONS = [
        "Next.js",
        "TypeScript",
        "React",
        "Node.js",
        "AWS",
        "GraphQL",
        "Microservices",
        "System Design",
        "Team Leadership",
    ];

    const fileId = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;
    const analyzedCount = useMemo(() => Object.keys(results).length, [results]);
    const successfulResults = useMemo(() => Object.values(results).filter(r => r.success), [results]);
    const avgScore = useMemo(() => {
        const scores = successfulResults.filter(r => r.score != null).map(r => r.score!);
        return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }, [successfulResults]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        let newFiles: UploadedFile[] = [];
        for (const file of selected) {
            let error = "";
            if (file.type !== ALLOWED_TYPE) error = "Only PDF files allowed.";
            else if (file.size > MAX_SIZE_MB * 1024 * 1024) error = `Max size is ${MAX_SIZE_MB}MB.`;
            newFiles.push({ file, error });
        }
        setFiles((prev) => {
            const merged = [...prev, ...newFiles].slice(0, MAX_FILES);
            return merged;
        });
        e.target.value = "";
    };

    const handleRemove = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleStartAnalysis = async () => {
        if (!jobTitle.trim() || (!jobLink.trim() && !jobDescription.trim())) return;
        if (files.length === 0 || files.some((f) => !!f.error)) return;

        const newFiles = files.filter((f) => !results[fileId(f.file)]);
        if (newFiles.length === 0) {
            toast({ title: "Nothing to analyze", description: "All uploaded resumes are already analyzed." });
            return;
        }

        setIsAnalyzing(true);
        // Don't clear existing results - keep them and add new ones
        try {
            const form = new FormData();
            for (const { file } of newFiles) {
                form.append("resumes", file, file.name);
            }
            form.append("jobTitle", jobTitle.trim());
            if (jobLink.trim()) form.append("jobLink", jobLink.trim());
            if (jobDescription.trim()) form.append("jobDescription", jobDescription.trim());
            if (hrFocus.trim()) form.append("hrFocus", hrFocus.trim());

            const res = await fetch(`${API_BASE}/api/v1/analyze-resumes-batch`, {
                method: "POST",
                body: form,
            });
            const isJson = res.headers.get("content-type")?.includes("application/json");
            const payload = isJson ? await res.json() : null;

            if (!res.ok || !payload?.success) {
                const msg = payload?.error?.message || `Request failed with status ${res.status}`;
                toast({ title: "Analysis failed", description: msg, variant: "destructive" });
                return;
            }

            const list: Array<{ name: string; success: boolean; score?: number | null; report?: string; error?: string }> = payload.results || [];
            setResults((prev) => {
                const next = { ...prev };
                for (const r of list) {
                    const matching = newFiles.find((f) => f.file.name === r.name);
                    const key = matching ? fileId(matching.file) : r.name;
                    next[key] = r;
                }
                return next;
            });
            toast({ title: "Analysis complete! 🎉", description: `Successfully analyzed ${list.length} resume(s).` });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Please try again later";
            toast({ title: "Network error", description: msg, variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const downloadReport = (name: string, report?: string) => {
        if (!report) return;
        const a = document.createElement("a");
        const file = new Blob([report], { type: "text/markdown" });
        a.href = URL.createObjectURL(file);
        const base = name?.replace(/\.[^/.]+$/, "") || "candidate";
        a.download = `${base}-analysis.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const downloadAllReports = () => {
        const successfulReports = successfulResults.filter(r => r.report);
        if (successfulReports.length === 0) {
            toast({ title: "No reports to download", description: "No successful analyses with reports found." });
            return;
        }

        // Create a combined report
        const combinedContent = [
            `# Batch Resume Analysis Report`,
            `**Job Title:** ${jobTitle}`,
            jobLink ? `**Job Link:** ${jobLink}` : '',
            `**Analysis Date:** ${new Date().toLocaleDateString()}`,
            `**Total Candidates:** ${successfulReports.length}`,
            avgScore ? `**Average Score:** ${avgScore}%` : '',
            `\n---\n`,
            ...successfulReports.map((r, index) => [
                `## ${index + 1}. ${cleanName(r.name)}`,
                r.score != null ? `**Score:** ${Math.round(r.score)}%` : '',
                `\n${r.report}\n`,
                `---\n`
            ].filter(Boolean).join('\n'))
        ].filter(Boolean).join('\n');

        const a = document.createElement("a");
        const file = new Blob([combinedContent], { type: "text/markdown" });
        a.href = URL.createObjectURL(file);
        a.download = `batch-analysis-${jobTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({ title: "Download started", description: `Combined report with ${successfulReports.length} analyses.` });
    };

    const downloadReportAsPDF = async (name: string, report?: string) => {
        if (!report) return;

        try {
            // Create a temporary div to render markdown
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
            position: absolute;
            left: -9999px;
            width: 800px;
            padding: 40px;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1f2937;
        `;

            // Convert markdown to HTML (simple conversion)
            const htmlContent = report
                .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; color: #1f2937;">$1</h1>')
                .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: bold; margin: 16px 0 8px 0; color: #374151;">$1</h2>')
                .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: bold; margin: 12px 0 6px 0; color: #4b5563;">$1</h3>')
                .replace(/^\*\*(.*)\*\*/gim, '<strong style="font-weight: bold;">$1</strong>')
                .replace(/^\*(.*)\*/gim, '<em style="font-style: italic;">$1</em>')
                .replace(/^- (.*$)/gim, '<li style="margin: 4px 0;">$1</li>')
                .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
                .replace(/\n/g, '<br>');

            tempDiv.innerHTML = `
            <div style="max-width: 100%;">
                <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                    <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0;">${cleanName(name)} - Analysis Report</h1>
                    <p style="color: #6b7280; margin: 10px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                <div style="margin: 0;">
                    <p style="margin: 12px 0;">${htmlContent}</p>
                </div>
            </div>
        `;

            document.body.appendChild(tempDiv);

            // Convert to canvas then PDF
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const base = name?.replace(/\.[^/.]+$/, "") || "candidate";
            pdf.save(`${base}-analysis.pdf`);

            document.body.removeChild(tempDiv);
            toast({ title: "PDF downloaded", description: "Analysis report saved as PDF." });

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast({ title: "PDF generation failed", description: "Please try downloading as markdown instead.", variant: "destructive" });
        }
    };

    const downloadAllReportsAsPDF = async () => {
        const successfulReports = successfulResults.filter(r => r.report);
        if (successfulReports.length === 0) {
            toast({ title: "No reports to download", description: "No successful analyses with reports found." });
            return;
        }

        try {
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
            position: absolute;
            left: -9999px;
            width: 800px;
            padding: 40px;
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1f2937;
        `;

            const coverPage = `
            <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 3px solid #3b82f6;">
                <h1 style="font-size: 32px; font-weight: bold; color: #1f2937; margin: 0 0 10px 0;">Batch Resume Analysis Report</h1>
                <p style="font-size: 18px; color: #3b82f6; font-weight: 600; margin: 0;">${jobTitle}</p>
                ${jobLink ? `<p style="color: #6b7280; margin: 10px 0;"><a href="${jobLink}" style="color: #3b82f6;">${jobLink}</a></p>` : ''}
                <div style="margin: 20px 0; display: flex; justify-content: center; gap: 40px;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #059669;">${successfulReports.length}</div>
                        <div style="font-size: 14px; color: #6b7280;">Candidates</div>
                    </div>
                    ${avgScore ? `
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${avgScore}%</div>
                        <div style="font-size: 14px; color: #6b7280;">Avg Score</div>
                    </div>` : ''}
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">${new Date().toLocaleDateString()}</div>
                        <div style="font-size: 14px; color: #6b7280;">Analysis Date</div>
                    </div>
                </div>
            </div>
        `;

            const reportsHTML = successfulReports
                .map((r, index) => {
                    const htmlContent = (r.report || '')
                        .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0; color: #1f2937;">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: bold; margin: 16px 0 8px 0; color: #374151;">$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: bold; margin: 12px 0 6px 0; color: #4b5563;">$1</h3>')
                        .replace(/^\*\*(.*)\*\*/gim, '<strong style="font-weight: bold;">$1</strong>')
                        .replace(/^\*(.*)\*/gim, '<em style="font-style: italic;">$1</em>')
                        .replace(/^- (.*$)/gim, '<li style="margin: 4px 0;">$1</li>')
                        .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
                        .replace(/\n/g, '<br>');

                    return `
                    <div style="page-break-before: ${index > 0 ? 'always' : 'auto'}; margin-bottom: 30px;">
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                            <h2 style="font-size: 22px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0;">${index + 1}. ${cleanName(r.name)}</h2>
                            ${r.score != null ? `<p style=\"font-size: 16px; color: #059669; font-weight: 600; margin: 0;\">Compatibility Score: ${Math.round(r.score)}%</p>` : ''}
                        </div>
                        <div style="margin: 0;">
                            <p style="margin: 12px 0;">${htmlContent}</p>
                        </div>
                    </div>
                `;
                })
                .join('');

            tempDiv.innerHTML = coverPage + reportsHTML;
            document.body.appendChild(tempDiv);

            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`batch-analysis-${jobTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);

            document.body.removeChild(tempDiv);
            toast({ title: "PDF downloaded", description: `Combined report for ${successfulReports.length} candidates.` });

        } catch (error) {
            console.error('PDF generation failed:', error);
            toast({ title: "PDF generation failed", description: "Please try downloading as markdown instead.", variant: "destructive" });
        }
    };

    const cleanName = (name: string) => {
        const base = (name || "").replace(/\.[^/.]+$/, "");
        const parts = base.split(" - ");
        return (parts[0] || base).trim() || base;
    };

    const viewResume = (file: File) => {
        const url = URL.createObjectURL(file);
        setResumePreview({ open: true, name: file.name, url });
    };

    const canAnalyze = jobTitle.trim() && (jobLink.trim() || jobDescription.trim()) && files.length > 0 && !files.some(f => f.error);
    const hasNewFiles = files.some(f => !results[fileId(f.file)]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Hero Section */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
                <div className="relative px-4 py-8 sm:py-12">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                            <Zap className="h-4 w-4" />
                            AI-Powered Resume Analysis
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-4">
                            Find the Perfect
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Candidate</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                            Upload multiple resumes and get instant AI analysis with compatibility scores for your job opening
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 pb-12 mt-5">
                {/* Job Details Card */}
                <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                                <Briefcase className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Job Details</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Job Title <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={jobTitle}
                                        onChange={e => setJobTitle(e.target.value)}
                                        placeholder="e.g. Senior Software Engineer"
                                        className="h-12 text-base border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Job Description
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            className="w-full h-32 border border-slate-200 dark:border-slate-700 rounded-lg p-3 pr-20 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={jobDescription}
                                            onChange={e => setJobDescription(e.target.value.slice(0, JD_MAX))}
                                            placeholder="Paste the complete job description here for better analysis accuracy..."
                                        />
                                        {jobDescription && (
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded px-2 py-1"
                                                onClick={() => setJobDescription("")}
                                                aria-label="Clear job description"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {jobDescription && (
                                            <span className={`absolute bottom-3 right-2 text-xs px-2 py-0.5 rounded-full ${jobDescription.length > JD_MAX * 0.9 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{jobDescription.length}/{JD_MAX}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Optional if Job Link is provided.</p>
                                    </div>
                                </div>


                            </div>

                            <div className="space-y-4">
                                <div>

                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Job Link
                                    </label>
                                    <Input
                                        value={jobLink}
                                        onChange={e => setJobLink(e.target.value)}
                                        placeholder="https://company.com/careers/job/123"
                                        className="h-12 text-base border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500/20"
                                        type="url"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        HR Notes
                                    </label>
                                    <div className="relative">
                                        <textarea
                                            className="w-full h-32 border border-slate-200 dark:border-slate-700 rounded-lg p-3 pr-20 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            value={hrFocus}
                                            onChange={e => setHrFocus(e.target.value.slice(0, HR_MAX))}
                                            placeholder="Add specific checks, e.g., ‘Ensure candidate has strong Next.js production experience’."
                                        />
                                        {hrFocus && (
                                            <span className={`absolute bottom-3 right-2 text-xs px-2 py-0.5 rounded-full ${hrFocus.length > HR_MAX * 0.9 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{hrFocus.length}/{HR_MAX}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* File Upload Card */}
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
                                {files.length}/{MAX_FILES} files
                            </Badge>
                        </div>

                        {/* Drag & Drop Zone */}
                        <div className="relative">
                            <input
                                type="file"
                                accept="application/pdf"
                                multiple
                                onChange={handleFileChange}
                                disabled={files.length >= MAX_FILES}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className={`block border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${files.length >= MAX_FILES
                                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                                    : 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 hover:border-blue-400 cursor-pointer'
                                    } dark:border-slate-600 dark:bg-slate-700/30 dark:hover:bg-slate-700/50`}
                            >
                                <Upload className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                    {files.length >= MAX_FILES ? 'Maximum files reached' : 'Drop PDF resumes here'}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {files.length >= MAX_FILES
                                        ? `You can upload up to ${MAX_FILES} files`
                                        : `or click to browse • PDF only • Max ${MAX_SIZE_MB}MB each`
                                    }
                                </p>
                            </label>
                        </div>

                        {/* Analysis Stats */}
                        {(analyzedCount > 0 || isAnalyzing) && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <div className="flex flex-col gap-4">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analyzedCount}</div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">Analyzed</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successfulResults.length}</div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">Successful</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{avgScore || '—'}</div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">Avg Score</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{files.length}</div>
                                            <div className="text-xs text-slate-600 dark:text-slate-400">Total Files</div>
                                        </div>
                                    </div>

                                    {/* Download Buttons */}
                                    {successfulResults.length > 1 && (
                                        <div className="flex justify-center gap-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                                            <Button
                                                onClick={downloadAllReports}
                                                variant="outline"
                                                size="sm"
                                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 hover:from-green-700 hover:to-emerald-700 shadow-md flex-1 max-w-[120px]"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                MD
                                            </Button>
                                            <Button
                                                onClick={downloadAllReportsAsPDF}
                                                variant="outline"
                                                size="sm"
                                                className="bg-gradient-to-r from-red-600 to-pink-600 text-white border-0 hover:from-red-700 hover:to-pink-700 shadow-md flex-1 max-w-[120px]"
                                            >
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

                {/* Files List */}
                {files.length > 0 && (
                    <Card className="mb-8 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                        <div className="p-6 sm:p-8">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Uploaded Resumes</h3>
                            <div className="space-y-3">
                                {files.map((f, i) => {
                                    const key = fileId(f.file);
                                    const r = results[key] || results[f.file.name];
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
                                                {/* File Info */}
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
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            {(f.file.size / 1024 / 1024).toFixed(1)} MB
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Score & Actions */}
                                                <div className="flex flex-col gap-3">
                                                    {pct != null && (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <Progress value={pct} className="h-3" />
                                                            </div>
                                                            <span className={`text-lg font-bold w-12 text-right ${pct >= 80 ? 'text-green-600 dark:text-green-400' :
                                                                pct >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                                                    pct >= 40 ? 'text-orange-600 dark:text-orange-400' :
                                                                        'text-red-600 dark:text-red-400'
                                                                }`}>{pct}%</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        {/* <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => viewResume(f.file)}
                                                            className="h-9 px-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-xs font-medium"
                                                        >
                                                            <Eye className="h-4 w-4 sm:mr-1" />
                                                            <span className="hidden sm:inline">View</span>
                                                        </Button> */}

                                                        {r?.report && r.success && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setPreview({ open: true, name: f.file.name, report: r.report || null })}
                                                                    className="h-9 px-3 text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/30"
                                                                >
                                                                    Report
                                                                </Button>
                                                                <div className="flex">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => downloadReport(f.file.name, r.report)}
                                                                        className="h-9 px-2 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 rounded-r-none"
                                                                        title="Download as Markdown"
                                                                    >
                                                                        MD
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => downloadReportAsPDF(f.file.name, r.report)}
                                                                        className="h-9 px-2 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 rounded-l-none border-l"
                                                                        title="Download as PDF"
                                                                    >
                                                                        PDF
                                                                    </Button>
                                                                </div>
                                                            </>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemove(i)}
                                                            className="h-9 w-9 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {f.error && (
                                                <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                                    <p className="text-sm text-red-700 dark:text-red-400">{f.error}</p>
                                                </div>
                                            )}

                                            {/* Analysis Error */}
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
                )}

                {/* Action Button */}
                {files.length > 0 && (
                    <div className="text-center">
                        <Button
                            onClick={handleStartAnalysis}
                            disabled={!canAnalyze || isAnalyzing || !hasNewFiles}
                            size="lg"
                            className="h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <span className="inline-flex items-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Analyzing Resumes...</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-3">
                                    <Zap className="h-5 w-5" />
                                    <span>
                                        {!hasNewFiles ? 'All Resumes Analyzed' :
                                            `Analyze ${files.filter(f => !results[fileId(f.file)]).length} Resume${files.filter(f => !results[fileId(f.file)]).length !== 1 ? 's' : ''}`}
                                    </span>
                                </span>
                            )}
                        </Button>

                        {!canAnalyze && files.length > 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                                {!jobTitle.trim() && "Job title is required"}
                                {jobTitle.trim() && !jobLink.trim() && !jobDescription.trim() && "Job link or description is required"}
                                {files.some(f => f.error) && "Please fix file errors"}
                            </p>
                        )}
                    </div>
                )}

                {/* Progress Indicator */}
                {isAnalyzing && (
                    <Card className="mt-6 border-0 shadow-lg bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <div className="p-6 text-center">
                            <div className="inline-flex items-center gap-3 text-blue-700 dark:text-blue-300 mb-3">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="font-semibold">AI Analysis in Progress</span>
                            </div>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                Our AI is analyzing resumes against your job requirements...
                            </p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Report Preview Dialog */}
            <Dialog open={preview.open} onOpenChange={(open) => setPreview(p => ({ ...p, open }))}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                    <DialogTitle className="text-xl font-bold">
                        {cleanName(preview.name)} — Analysis Report
                    </DialogTitle>
                    <div className="flex-1 overflow-auto border rounded-lg bg-slate-50 dark:bg-slate-900">
                        <div className="prose prose-slate dark:prose-invert max-w-none p-6">
                            {preview.report ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview.report}</ReactMarkdown>
                            ) : (
                                <div className="text-center py-12 text-slate-500">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No report content available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Resume Preview Dialog */}
            <Dialog open={resumePreview.open} onOpenChange={(open) => {
                if (!open && resumePreview.url) URL.revokeObjectURL(resumePreview.url);
                setResumePreview(p => ({ ...p, open }));
            }}>
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                    <DialogTitle className="text-xl font-bold">
                        {cleanName(resumePreview.name)} — Resume Preview
                    </DialogTitle>
                    <div className="flex-1 overflow-hidden border rounded-lg bg-white">
                        {resumePreview.url ? (
                            <iframe
                                src={resumePreview.url}
                                className="w-full h-full min-h-[70vh]"
                                title="Resume Preview"
                                style={{ border: 'none' }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-96 text-slate-500">
                                <div className="text-center">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No preview available.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HRBatchPage;