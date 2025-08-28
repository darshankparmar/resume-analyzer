import React, { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { JobInformation } from "@/components/JobInformation";
import { AnalysisResults } from "@/components/AnalysisResults";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Briefcase } from "lucide-react";
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
  const { toast } = useToast();
  const API_BASE = (import.meta as ImportMeta).env?.VITE_API_BASE_URL || "";

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file);
    toast({
      title: "Resume uploaded successfully",
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
      toast({
        title: "Analysis complete!",
        description: "Your resume analysis report is ready",
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
    setAnalysisReport(null);
    toast({
      title: "Report cleared",
      description: "The resume analysis report has been removed.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Resume Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                Optimize your resume for your dream job
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-4">
            <Card className="p-6 bg-gradient-to-b from-card to-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Upload Resume</h2>
              </div>
              <FileUpload
                onFileUpload={handleFileUpload}
                uploadedFile={uploadedFile}
              />
            </Card>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-8">
            <div className="space-y-6">
              {/* Job Information */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Job Information</h2>
                </div>
                <JobInformation
                  jobData={jobData}
                  onJobDataChange={setJobData}
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                  canAnalyze={!!uploadedFile && !!jobData.title}
                />
              </Card>

              {/* Analysis Results */}
              {analysisReport && (
                <AnalysisResults
                  report={analysisReport}
                  onClear={handleClearReport}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
