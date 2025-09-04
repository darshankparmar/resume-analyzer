import React, { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { FileUpload } from "../components/individual/FileUpload";
import { JobInformation } from "../components/individual/JobInformation";
import { AnalysisResults } from "../components/individual/AnalysisResults";
import { Card } from "@/components/ui/card";
import { FileText, Briefcase, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface UploadedFile {
  file: File;
  name: string;
  size: string;
  preview?: string;
}

export interface JobData {
  title: string;
  description: string;
  link: string;
  hrFocus?: string;
}

export interface AnalysisReport {
  content: string;
  timestamp: string;
}

const Individual = () => {
  // Removed legacy HR modal; navigation now lives in the header
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [jobData, setJobData] = useState<JobData>({
    title: "",
    description: "",
    link: "",
    hrFocus: "",
  });
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const navigate = useNavigate();
  const API_BASE = import.meta.env?.VITE_API_BASE_URL || "";
  type Mode = "report" | "optimized";
  const [mode, setMode] = useState<Mode>("report");

  // Auto-advance from 1 -> 2 only (stop auto-advance 2 -> 3; user will proceed manually)
  useEffect(() => {
    if (uploadedFile && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [uploadedFile, currentStep]);

  // helper for step icon classes
  const stepIconClass = (completed: boolean, isCurrent: boolean) => {
    if (completed)
      return "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg";
    if (isCurrent)
      return "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg";
    return "bg-gray-100 text-gray-400";
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    toast({
      title: "🎉 Resume uploaded!",
      description: `${file.name} is ready for analysis`,
    });
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
    setCurrentStep(1);
  };

  const handleAnalyze = async () => {
    if (!uploadedFile || !jobData.title) {
      toast({
        title: "Missing information",
        description: "Please upload a resume and enter a job title",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("resume", uploadedFile.file);
      formData.append("jobTitle", jobData.title);
      if (jobData.description)
        formData.append("jobDescription", jobData.description);
      if (jobData.link) formData.append("jobLink", jobData.link);
      if (jobData.hrFocus) formData.append("hrFocus", jobData.hrFocus);

      const res = await fetch(`${API_BASE}/api/v1/analyze-resume`, {
        method: "POST",
        body: (() => {
          if (mode === "optimized") {
            formData.append("generateResumeJson", "true");
          }
          return formData;
        })(),
      });

      const isJson = res.headers
        .get("content-type")
        ?.includes("application/json");
      const payload = isJson ? await res.json() : null;

      if (!res.ok) {
        const message =
          payload?.error?.message || `Request failed with status ${res.status}`;
        toast({
          title: "Analysis failed",
          description: message,
          variant: "destructive",
        });
        return;
      }

      if (mode === "optimized") {
        const jsonText: string | undefined = payload?.data?.optimizedResumeJson;
        if (!jsonText) {
          toast({
            title: "Generation failed",
            description: "Invalid response from server",
            variant: "destructive",
          });
          return;
        }
        navigate("/optimized", {
          state: {
            optimizedJson: jsonText,
            jobTitle: jobData.title,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        const reportContent: string | undefined = payload?.data?.analysisReport;
        if (!reportContent) {
          toast({
            title: "Analysis failed",
            description: "Invalid response from server",
            variant: "destructive",
          });
          return;
        }
        setAnalysisReport({
          content: reportContent,
          timestamp: new Date().toISOString(),
        });
        setCurrentStep(4);
        toast({
          title: "✨ Analysis complete!",
          description: "Your personalized report is ready",
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Please try again later";
      toast({
        title: "Network error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearReport = () => {
    // Reset everything to start a fresh analysis at Step 1
    setAnalysisReport(null);
    setUploadedFile(null);
    setJobData({ title: "", description: "", link: "" });
    setCurrentStep(1);
    toast({
      title: "Report cleared",
      description: "Start a new analysis from Step 1",
    });
  };

  const steps = [
    {
      number: 1,
      title: "Upload Resume",
      icon: FileText,
      completed: !!uploadedFile,
    },
    {
      number: 2,
      title: "Job Details",
      icon: Briefcase,
      completed: !!jobData.title,
    },
    {
      number: 3,
      title: "Analyze",
      icon: Sparkles,
      completed: !!analysisReport,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header with navigation & Sign out */}
      <AppHeader />

      {/* Progress Steps - Mobile First */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 sm:gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-200/50">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${stepIconClass(
                      step.completed,
                      currentStep === step.number
                    )}`}
                  >
                    <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span
                    className={`text-sm sm:text-base font-medium hidden sm:block ${
                      step.completed || currentStep === step.number
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${
                      step.completed
                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Content - Single Column Mobile First */}
        <div className="max-w-4xl mx-auto">
          {currentStep <= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* File Upload */}
              <Card className="p-6 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-xl rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Upload Resume
                  </h2>
                </div>
                <FileUpload
                  onFileUpload={handleFileUpload}
                  uploadedFile={uploadedFile}
                  onRemove={handleRemoveUploadedFile}
                />
              </Card>

              {/* Job Information */}
              <Card className="p-6 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-xl rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Job Details
                  </h2>
                </div>
                <JobInformation
                  jobData={jobData}
                  onJobDataChange={setJobData}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  canAnalyze={!!uploadedFile && !!jobData.title}
                  mode={mode}
                  onModeChange={setMode}
                />
              </Card>
            </div>
          )}

          {/* Analysis Results */}
          {analysisReport && (
            <div className="mb-8">
              <AnalysisResults
                report={analysisReport}
                onClear={handleClearReport}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Individual;
