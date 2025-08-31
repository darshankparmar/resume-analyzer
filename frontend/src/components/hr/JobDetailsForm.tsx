import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, X } from "lucide-react";

interface Props {
    jobTitle: string;
    setJobTitle: (v: string) => void;
    jobLink: string;
    setJobLink: (v: string) => void;
    jobDescription: string;
    setJobDescription: (v: string) => void;
    hrFocus: string;
    setHrFocus: (v: string) => void;
    JD_MAX: number;
    HR_MAX: number;
    questionInput: string;
    setQuestionInput: (v: string) => void;
    questions: string[];
    addQuestion: () => void;
    removeQuestion: (idx: number) => void;
    quickAdd: (q: string) => void;
}

const JobDetailsForm: React.FC<Props> = ({
    jobTitle,
    setJobTitle,
    jobLink,
    setJobLink,
    jobDescription,
    setJobDescription,
    hrFocus,
    setHrFocus,
    JD_MAX,
    HR_MAX,
    questionInput,
    setQuestionInput,
    questions,
    addQuestion,
    removeQuestion,
    quickAdd,
}) => {
    return (
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
                                onChange={(e) => setJobTitle(e.target.value)}
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
                                    onChange={(e) => setJobDescription(e.target.value.slice(0, JD_MAX))}
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
                                onChange={(e) => setJobLink(e.target.value)}
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
                                    className="w-full h-24 md:h-28 border border-slate-200 dark:border-slate-700 rounded-lg p-3 pr-20 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    value={hrFocus}
                                    onChange={(e) => setHrFocus(e.target.value.slice(0, HR_MAX))}
                                    placeholder="Add specific checks, e.g., ‘Ensure candidate has strong Next.js production experience’."
                                />
                                {hrFocus && (
                                    <span className={`absolute bottom-3 right-2 text-xs px-2 py-0.5 rounded-full ${hrFocus.length > HR_MAX * 0.9 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{hrFocus.length}/{HR_MAX}</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                HR Questions <span className="text-xs font-normal text-slate-500">(up to 5)</span>
                            </label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    value={questionInput}
                                    onChange={(e) => setQuestionInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); addQuestion(); }
                                    }}
                                    placeholder="e.g. How many years of experience in React.js?"
                                    className="h-10 flex-1"
                                />
                                <Button type="button" onClick={addQuestion} className="h-10 px-3" disabled={!questionInput.trim() || questions.length >= 5}>
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only">Add question</span>
                                </Button>
                            </div>
                            {questions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {questions.map((q, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs">
                                            <span className="truncate max-w-[200px] sm:max-w-[280px]" title={q}>{q}</span>
                                            <button type="button" onClick={() => removeQuestion(idx)} className="text-slate-500 hover:text-red-600">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {["Years of React.js experience?", "Years of TypeScript experience?", "Team size managed?", "Notice period?", "Relocation/Remote preference?", "Highest degree?",].map((s, i) => (
                                    <button key={i} type="button" onClick={() => quickAdd(s)} className="text-xs px-2 py-1 rounded-full border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700" disabled={questions.length >= 5}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default JobDetailsForm;
