import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link,
  Plus,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobData } from "@/pages/Individual";

interface JobInformationProps {
  jobData: JobData;
  onJobDataChange: (data: JobData) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  canAnalyze: boolean;
}

export const JobInformation: React.FC<JobInformationProps> = ({
  jobData,
  onJobDataChange,
  onAnalyze,
  isAnalyzing,
  canAnalyze,
}) => {
  const [showOptional, setShowOptional] = useState(false);
  const DESCRIPTION_MAX = 3000;

  const handleInputChange = (field: keyof JobData, value: string) => {
    if (field === "description" && value.length > DESCRIPTION_MAX) {
      value = value.slice(0, DESCRIPTION_MAX);
    }
    onJobDataChange({
      ...jobData,
      [field]: value,
    });
  };

  // Auto-expand optional fields if user starts typing
  const handleOptionalFieldFocus = () => {
    if (!showOptional) {
      setShowOptional(true);
    }
  };

  const isReadyToAnalyze = canAnalyze && jobData.title.length > 2;

  return (
    <div className="space-y-6">
      {/* Job Title - Primary Input */}
      <div className="space-y-3">
        <Label
          htmlFor="job-title"
          className="text-base font-semibold text-gray-900 flex items-center gap-2"
        >
          <Briefcase className="h-4 w-4 text-blue-600" />
          Job Title
        </Label>
        <Input
          id="job-title"
          placeholder="Enter the job title you're applying for..."
          value={jobData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          className="text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 bg-white/80 backdrop-blur-sm h-12 px-4 transition-all duration-200"
          autoFocus
        />
        {jobData.title && (
          <div className="flex items-center gap-2 text-sm text-green-600 animate-in slide-in-from-left-2 duration-300">
            <CheckCircle className="h-4 w-4" />
            <span>Job title added</span>
          </div>
        )}
      </div>

      {/* Optional Fields Toggle */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowOptional(!showOptional)}
          className="w-full justify-between h-auto p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 font-medium transition-all duration-300 group"
          type="button"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                showOptional
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600"
              )}
            >
              <Plus
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  showOptional && "rotate-45"
                )}
              />
            </div>
            <span
              className={cn(
                "transition-colors duration-300",
                showOptional
                  ? "text-blue-700"
                  : "text-gray-600 group-hover:text-blue-600"
              )}
            >
              Add more details for better analysis
            </span>
          </div>
          {showOptional ? (
            <ChevronUp className="h-5 w-5 text-blue-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
          )}
        </Button>

        {/* Optional Fields */}
        {showOptional && (
          <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
            <Card className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border border-blue-200/50 rounded-xl">
              {/* Job Link */}
              <div className="space-y-3 mb-6">
                <Label
                  htmlFor="job-link"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Link className="h-4 w-4 text-blue-500" />
                  Job Posting URL
                </Label>
                <Input
                  id="job-link"
                  placeholder="https://company.com/careers/job-posting"
                  value={jobData.link}
                  onChange={(e) => handleInputChange("link", e.target.value)}
                  onFocus={handleOptionalFieldFocus}
                  type="url"
                  className="rounded-lg border-gray-200 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
                />
                {jobData.link && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>Job link added</span>
                  </div>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-3">
                <Label
                  htmlFor="job-description"
                  className="text-sm font-semibold text-gray-700"
                >
                  Job Description
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the complete job description here for more precise analysis..."
                  value={jobData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  onFocus={handleOptionalFieldFocus}
                  rows={8}
                  className="resize-none rounded-lg border-gray-200 focus:border-blue-500 bg-white/80 backdrop-blur-sm text-sm transition-all duration-200"
                  maxLength={DESCRIPTION_MAX}
                />

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Sparkles className="h-3 w-3" />
                    <span>More details = better analysis results</span>
                  </div>
                  <span
                    className={cn(
                      "font-medium px-2 py-1 rounded-full",
                      jobData.description.length > DESCRIPTION_MAX * 0.9
                        ? "text-orange-600 bg-orange-100"
                        : "text-gray-500 bg-gray-100"
                    )}
                  >
                    {jobData.description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>

                {jobData.description && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    <span>
                      Job description added (
                      {jobData.description.split(" ").length} words)
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Analysis Button - Prominent */}
      <Card
        className={cn(
          "p-6 transition-all duration-500 rounded-2xl border-0 overflow-hidden relative",
          isReadyToAnalyze
            ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-2xl transform hover:scale-[1.02]"
            : "bg-gradient-to-r from-gray-200 to-gray-300"
        )}
      >
        {/* Background Animation */}
        {isReadyToAnalyze && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        )}

        <div className="relative z-10">
          <Button
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            size="lg"
            className={cn(
              "w-full text-lg font-bold rounded-xl border-0 h-16 transition-all duration-300 relative overflow-hidden",
              isReadyToAnalyze
                ? "bg-white text-blue-600 hover:bg-gray-50 shadow-lg hover:shadow-xl"
                : "bg-white/50 text-gray-500 cursor-not-allowed"
            )}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Analyzing your resume...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Sparkles
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isReadyToAnalyze && "animate-pulse"
                  )}
                />
                <span>Generate Analysis Report</span>
              </div>
            )}
          </Button>

          {/* Status Messages */}
          <div className="mt-4">
            {!canAnalyze && (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {!jobData.title
                    ? "👆 Enter a job title to begin"
                    : "📄 Upload your resume to continue"}
                </p>
                <div className="flex justify-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      jobData.title ? "bg-green-500" : "bg-gray-300"
                    )}
                  />
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      canAnalyze ? "bg-green-500" : "bg-gray-300"
                    )}
                  />
                </div>
              </div>
            )}
            {canAnalyze && isReadyToAnalyze && !isAnalyzing && (
              <div className="text-center">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <p className="text-sm font-medium text-white mb-1">
                    ✨ Ready to generate your personalized analysis
                  </p>
                  <p className="text-xs text-white/80">
                    {jobData.description
                      ? "Using job description for detailed matching"
                      : "Basic analysis mode"}
                  </p>
                </div>
              </div>
            )}
            {isAnalyzing && (
              <div className="text-center">
                <div className="p-3 bg-blue-100/80 rounded-xl">
                  <p className="text-sm font-medium text-blue-900">
                    🤖 AI is analyzing your resume against job requirements...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tips Card - Shows when optional fields are visible */}
      {showOptional && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/50 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900 mb-1">Pro Tip</h4>
              <p className="text-sm text-purple-700 leading-relaxed">
                Including the full job description helps our AI provide more
                targeted suggestions and identify specific skills to highlight
                in your resume.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
