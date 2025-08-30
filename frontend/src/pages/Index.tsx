import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";
import { JobInformation } from "@/components/JobInformation";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Briefcase, Sparkles, Menu, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export interface AnalysisReport {
  content: string;
  timestamp: string;
}

const Index = () => {
  const [showHRDialog, setShowHRDialog] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [jobData, setJobData] = useState<JobData>({
    title: "",
    description: "",
    link: "",
  });
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  const API_BASE = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || "";

  // Auto-advance from 1 -> 2 only (stop auto-advance 2 -> 3; user will proceed manually)
  useEffect(() => {
    if (uploadedFile && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [uploadedFile, currentStep]);

  const canProceedToStep3 = Boolean(
    uploadedFile &&
    jobData.title.trim().length >= 3 &&
    (jobData.description.trim().length > 0 || jobData.link.trim().length > 0)
  );

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    toast({
      title: "🎉 Resume uploaded!",
      description: `${file.name} is ready for analysis`,
    });
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

      const res = await fetch(`${API_BASE}/api/v1/analyze-resume`, {
        method: "POST",
        body: formData,
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
    { number: 1, title: "Upload Resume", icon: FileText, completed: !!uploadedFile },
    { number: 2, title: "Job Details", icon: Briefcase, completed: !!jobData.title },
    { number: 3, title: "Analyze", icon: Sparkles, completed: !!analysisReport },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* HR Dialog */}
      <Dialog open={showHRDialog}>
        <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
        <DialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-white rounded-2xl shadow-2xl border-0 z-50 p-8">
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Are you HR?</h2>
              <p className="text-gray-600">Access our batch analysis portal for processing multiple resumes</p>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-xl font-semibold"
                onClick={() => {
                  setShowHRDialog(false);
                  navigate("/hr");
                }}
              >
                Yes, I'm HR
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-semibold"
                onClick={() => setShowHRDialog(false)}
              >
                Individual User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-gray-200/50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Resume Analyzer
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  AI-powered resume optimization
                </p>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps - Mobile First */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 sm:gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-200/50">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${step.completed
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                      : currentStep === step.number
                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-400"
                      }`}
                  >
                    <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className={`text-sm sm:text-base font-medium hidden sm:block ${step.completed || currentStep === step.number
                    ? "text-gray-900"
                    : "text-gray-500"
                    }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 transition-all duration-300 ${step.completed ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gray-200"
                    }`} />
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
                  <h2 className="text-xl font-bold text-gray-900">Upload Resume</h2>
                </div>
                <FileUpload
                  onFileUpload={handleFileUpload}
                  uploadedFile={uploadedFile}
                />
              </Card>

              {/* Job Information */}
              <Card className="p-6 bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-xl rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Job Details</h2>
                </div>
                <JobInformation
                  jobData={jobData}
                  onJobDataChange={setJobData}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  canAnalyze={!!uploadedFile && !!jobData.title}
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

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Menu</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMobileMenu(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {/* Add mobile menu content here if needed */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;