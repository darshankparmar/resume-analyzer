import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobData } from "@/pages/Index";

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
  const [showDescription, setShowDescription] = useState(false);
  const DESCRIPTION_MAX = 3000;

  const handleInputChange = (field: keyof JobData, value: string) => {
    // Clamp description length defensively in case of programmatic inserts
    if (field === "description" && value.length > DESCRIPTION_MAX) {
      value = value.slice(0, DESCRIPTION_MAX);
    }
    onJobDataChange({
      ...jobData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Job Title */}
      <div className="space-y-2">
        <Label htmlFor="job-title" className="text-base font-medium">
          Job Title *
        </Label>
        <Input
          id="job-title"
          placeholder="e.g., Senior Software Engineer, Product Manager..."
          value={jobData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          className="text-base"
        />
      </div>

      {/* Job Description Link */}
      <div className="space-y-2">
        <Label htmlFor="job-link" className="text-base font-medium">
          Job Description Link (Optional)
        </Label>
        <Input
          id="job-link"
          placeholder="https://company.com/careers/job-id"
          value={jobData.link}
          onChange={(e) => handleInputChange("link", e.target.value)}
          type="url"
          className="text-base"
        />
      </div>

      {/* Add Job Description Button */}
      <div>
        <Button
          variant="outline"
          onClick={() => setShowDescription(!showDescription)}
          className="w-full justify-between"
          type="button"
        >
          Add Job Description (Optional)
          {showDescription ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Job Description Textarea */}
      {showDescription && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
          <Label htmlFor="job-description" className="text-base font-medium">
            Job Description
          </Label>
          <Textarea
            id="job-description"
            placeholder="Paste the complete job description here for more accurate analysis..."
            value={jobData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            rows={8}
            className="resize-none text-sm"
            maxLength={DESCRIPTION_MAX}
            aria-describedby="job-description-help"
          />
          <div
            id="job-description-help"
            className="text-xs text-muted-foreground flex items-center justify-between"
          >
            <span>
              Including the full job description will provide more detailed
              analysis and better matching insights.
            </span>
            <span>
              {jobData.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <Button
          onClick={onAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          size="lg"
          className={cn(
            "w-full text-base font-semibold",
            isAnalyzing && "opacity-80"
          )}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Analyzing Resume...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Analyze & Generate Report
            </>
          )}
        </Button>

        {!canAnalyze && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Upload a resume and enter a job title to begin analysis
          </p>
        )}
      </Card>
    </div>
  );
};
