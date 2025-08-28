import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Trash2,
} from "lucide-react";
import type { AnalysisReport } from "@/pages/Index";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  h1: ({ className, children, ...props }) => (
    <h1 className={`text-2xl font-bold mb-4 ${className ?? ""}`} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }) => (
    <h2
      className={`text-xl font-semibold mt-6 mb-3 ${className ?? ""}`}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3
      className={`text-lg font-semibold mt-4 mb-2 ${className ?? ""}`}
      {...props}
    >
      {children}
    </h3>
  ),
  ul: ({ className, ...props }) => (
    <ul className={`list-disc pl-6 space-y-1 ${className ?? ""}`} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={`list-decimal pl-6 space-y-1 ${className ?? ""}`}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={`marker:text-primary ${className ?? ""}`} {...props} />
  ),
  blockquote: ({ className, children, ...props }) => (
    <blockquote
      className={`border-l-2 pl-4 italic text-muted-foreground ${
        className ?? ""
      }`}
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ className, children, ...props }) => (
    <a
      className={`text-primary underline underline-offset-4 hover:text-primary/90 ${
        className ?? ""
      }`}
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = !!className && className.includes("language-");
    if (isBlock) {
      return (
        <pre className="p-3 rounded bg-muted overflow-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="px-1.5 py-0.5 rounded bg-muted text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  input: ({ type, checked, ...props }) => {
    if (type === "checkbox") {
      return (
        <CheckCircle
          className={`inline-block mr-2 h-4 w-4 ${
            checked ? "text-success" : "text-muted-foreground"
          }`}
        />
      );
    }
    return <input type={type} {...props} />;
  },
};

interface AnalysisResultsProps {
  report: AnalysisReport;
  onClear?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  report,
  onClear,
}) => {
  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([report.content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `resume-analysis-${
      new Date().toISOString().split("T")[0]
    }.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10 text-success">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Analysis Complete
              <Badge
                variant="outline"
                className="bg-success/10 text-success border-success/30"
              >
                Ready
              </Badge>
            </h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              Generated on {formatDate(report.timestamp)}
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Report Content */}
      <div className="prose prose-slate dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-foreground max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
        >
          {report.content}
        </ReactMarkdown>
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t">
        {/* <Button onClick={handleDownload} className="flex-1 sm:flex-none">
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button> */}
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 sm:flex-none"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
        {onClear && (
          <Button
            onClick={onClear}
            variant="destructive"
            className="flex-1 sm:flex-none"
            aria-label="Clear analysis report"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Report
          </Button>
        )}
      </div>
    </Card>
  );
};
