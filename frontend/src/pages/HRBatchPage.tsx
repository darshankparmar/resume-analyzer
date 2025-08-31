import React, { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Loader2, Zap } from "lucide-react";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JobDetailsForm from "@/components/hr/JobDetailsForm";
import ResumeUploadSection from "@/components/hr/ResumeUploadSection";
import UploadedFilesList from "@/components/hr/UploadedFilesList";
import { AnalysisResult, UploadedFile } from "@/components/hr/types";

const MAX_FILES = 10;
const MAX_SIZE_MB = 2;
const ALLOWED_TYPE = "application/pdf";

const HRBatchPage: React.FC = () => {
    const [jobTitle, setJobTitle] = useState("");
    const [jobLink, setJobLink] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [hrFocus, setHrFocus] = useState("");
    const [questionInput, setQuestionInput] = useState("");
    const [questions, setQuestions] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<Record<string, AnalysisResult>>({});
    const [preview, setPreview] = useState<{ open: boolean; name: string; report: string | null }>(
        { open: false, name: "", report: null }
    );
    const [resumePreview, setResumePreview] = useState<{ open: boolean; name: string; url: string | null }>({ open: false, name: "", url: null });
    const { toast } = useToast();
    const API_BASE = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || "";
    const JD_MAX = 3000;
    const HR_MAX = 500;

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
            // Merge HR focus + questions into a single prioritized instruction for the backend
            const cleanedQs = questions.map(q => q.trim()).filter(Boolean);
            const hrFocusFinal = [
                hrFocus.trim() || "",
                cleanedQs.length
                    ? (
                        "Please also answer the following HR Questions directly within the existing sections (use concise bullets and evidence snippets as required by the format). If insufficient evidence, state it clearly.\n" +
                        cleanedQs.map((q, i) => `${i + 1}. ${q}`).join("\n")
                    )
                    : ""
            ].filter(Boolean).join("\n\n");
            if (hrFocusFinal) form.append("hrFocus", hrFocusFinal);
            if (cleanedQs.length) form.append("hrQuestions", JSON.stringify(cleanedQs));

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

    // HR Questions helpers
    const addQuestion = () => {
        const q = (questionInput || "").trim();
        if (!q) return;
        if (questions.length >= 5) {
            toast({ title: "Limit reached", description: "You can add up to 5 questions.", variant: "destructive" });
            return;
        }
        if (questions.some(existing => existing.toLowerCase() === q.toLowerCase())) {
            toast({ title: "Duplicate question", description: "This question is already added.", variant: "destructive" });
            return;
        }
        setQuestions(prev => [...prev, q]);
        setQuestionInput("");
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const quickAdd = (q: string) => {
        if (questions.length >= 5) {
            toast({ title: "Limit reached", description: "You can add up to 5 questions.", variant: "destructive" });
            return;
        }
        if (questions.some(existing => existing.toLowerCase() === q.toLowerCase())) return;
        setQuestions(prev => [...prev, q]);
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
            <AppHeader />
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
                <JobDetailsForm
                    jobTitle={jobTitle}
                    setJobTitle={setJobTitle}
                    jobLink={jobLink}
                    setJobLink={setJobLink}
                    jobDescription={jobDescription}
                    setJobDescription={setJobDescription}
                    hrFocus={hrFocus}
                    setHrFocus={setHrFocus}
                    JD_MAX={JD_MAX}
                    HR_MAX={HR_MAX}
                    questionInput={questionInput}
                    setQuestionInput={setQuestionInput}
                    questions={questions}
                    addQuestion={addQuestion}
                    removeQuestion={removeQuestion}
                    quickAdd={quickAdd}
                />

                <ResumeUploadSection
                    filesCount={files.length}
                    maxFiles={MAX_FILES}
                    maxSizeMb={MAX_SIZE_MB}
                    onFileChange={handleFileChange}
                    disabled={files.length >= MAX_FILES}
                    analyzedCount={analyzedCount}
                    successfulCount={successfulResults.length}
                    avgScore={avgScore}
                    totalFiles={files.length}
                    onDownloadAllMd={downloadAllReports}
                    onDownloadAllPdf={downloadAllReportsAsPDF}
                />

                {/* Files List */}
                <UploadedFilesList
                    files={files}
                    results={results}
                    fileId={fileId}
                    onRemove={handleRemove}
                    onOpenReport={(name, report) => setPreview({ open: true, name, report: report || null })}
                    onDownloadMd={downloadReport}
                    onDownloadPdf={downloadReportAsPDF}
                    cleanName={cleanName}
                />

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