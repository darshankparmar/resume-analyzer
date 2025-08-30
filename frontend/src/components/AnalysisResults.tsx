import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  Calendar,
  CheckCircle,
  Trash2,
  Share,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
} from "lucide-react";
import type { AnalysisReport } from "@/pages/Index";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useToast } from "@/hooks/use-toast";

const markdownComponents: Components = {
  h1: ({ className, children, ...props }) => (
    <h1 className={`text-3xl font-bold mb-6 text-gray-900 ${className ?? ""}`} {...props}>
      {children}
    </h1>
  ),
  h2: ({ className, children, ...props }) => (
    <h2
      className={`text-2xl font-bold mt-8 mb-4 text-gray-900 pb-2 border-b border-gray-200 ${className ?? ""}`}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3
      className={`text-xl font-semibold mt-6 mb-3 text-gray-800 ${className ?? ""}`}
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ className, children, ...props }) => (
    <h4
      className={`text-lg font-semibold mt-4 mb-2 text-gray-800 ${className ?? ""}`}
      {...props}
    >
      {children}
    </h4>
  ),
  ul: ({ className, ...props }) => (
    <ul className={`list-none space-y-2 ${className ?? ""}`} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={`list-decimal pl-6 space-y-2 ${className ?? ""}`}
      {...props}
    />
  ),
  li: ({ className, children, ...props }) => (
    <li className={`flex items-start gap-2 ${className ?? ""}`} {...props}>
      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ className, children, ...props }) => (
    <blockquote
      className={`border-l-4 border-blue-500 bg-blue-50/50 pl-4 py-2 italic text-gray-700 rounded-r-lg ${className ?? ""
        }`}
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ className, children, ...props }) => (
    <a
      className={`text-blue-600 underline underline-offset-2 hover:text-blue-800 font-medium ${className ?? ""
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
        <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 overflow-auto border">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code
        className="px-2 py-1 rounded-md bg-gray-100 text-gray-800 font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    );
  },
  p: ({ className, children, ...props }) => (
    <p className={`text-gray-700 leading-relaxed mb-4 ${className ?? ""}`} {...props}>
      {children}
    </p>
  ),
  strong: ({ className, children, ...props }) => (
    <strong className={`font-semibold text-gray-900 ${className ?? ""}`} {...props}>
      {children}
    </strong>
  ),
};

interface AnalysisResultsProps {
  report: AnalysisReport;
  onClear?: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  report,
  onClear,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownloadMarkdown = () => {
    const element = document.createElement("a");
    const file = new Blob([report.content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `resume-analysis-${new Date().toISOString().split("T")[0]
      }.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "📄 Downloaded!",
      description: "Markdown report saved to your device",
    });
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    try {
      // Create a clean HTML version for PDF conversion
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Resume Analysis Report</title>
          <style>
            body { 
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 40px 20px;
              background: white;
            }
            h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #1e40af; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            h3 { color: #374151; margin-top: 25px; }
            ul { padding-left: 0; }
            li { 
              list-style: none; 
              padding: 8px 0; 
              border-left: 3px solid #10b981; 
              padding-left: 15px; 
              margin: 5px 0;
              background: #f0fdf4;
            }
            blockquote { 
              border-left: 4px solid #3b82f6; 
              background: #eff6ff; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 0 8px 8px 0;
            }
            code { 
              background: #f3f4f6; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: monospace;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              padding: 20px; 
              background: linear-gradient(135deg, #3b82f6, #1e40af); 
              color: white; 
              border-radius: 12px;
            }
            .footer { 
              margin-top: 40px; 
              padding: 20px; 
              background: #f9fafb; 
              border-radius: 12px; 
              text-align: center; 
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: white; border: none; margin: 0;">Resume Analysis Report</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Generated on ${new Date(report.timestamp).toLocaleDateString()}</p>
          </div>
          ${report.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
          <div class="footer">
            <p>Generated by Resume Analyzer AI • ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `;

      // Convert HTML to PDF using browser's print functionality
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }

      toast({
        title: "📄 PDF Generation",
        description: "Print dialog opened - save as PDF",
      });
    } catch (error) {
      toast({
        title: "❌ Download failed",
        description: "Please try again or download as Markdown",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report.content);
      toast({
        title: "📋 Copied!",
        description: "Report content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "❌ Copy failed",
        description: "Please select and copy manually",
        variant: "destructive",
      });
    }
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
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-green-900">Analysis Complete!</h2>
                <Badge className="bg-green-100 text-green-800 border-green-300 rounded-full px-3">
                  Ready
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Calendar className="h-4 w-4" />
                <span>Generated {formatDate(report.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-green-700 hover:bg-green-100 rounded-lg"
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Content */}
      {isExpanded && (
        <Card className="overflow-hidden rounded-2xl border-0 shadow-xl">
          {/* Content Header */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Your Analysis Report</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="text-gray-600 hover:bg-white/80 rounded-lg"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-600 hover:bg-white/80 rounded-lg"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6 sm:p-8 bg-white">
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {report.content}
              </ReactMarkdown>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isDownloading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </div>
          )}
        </Button>

        <Button
          onClick={handleDownloadMarkdown}
          variant="outline"
          className="border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl font-semibold transition-all duration-300"
        >
          <Download className="h-4 w-4 mr-2" />
          Download MD
        </Button>

        <Button
          onClick={handleCopyToClipboard}
          variant="outline"
          className="border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 rounded-xl font-semibold transition-all duration-300"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy Text
        </Button>

        {onClear && (
          <Button
            onClick={onClear}
            variant="outline"
            className="border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl font-semibold transition-all duration-300"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            New Analysis
          </Button>
        )}
      </div>

      {/* Stats Card */}
      {/* <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200/50 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-900">{report.content.split(' ').length}</div>
            <div className="text-sm text-purple-700">Words Analyzed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">{report.content.split('\n').filter(line => line.trim().startsWith('##')).length}</div>
            <div className="text-sm text-purple-700">Key Sections</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-900">
              {report.content.split('\n').filter(line => line.trim().startsWith('- ')).length}
            </div>
            <div className="text-sm text-purple-700">Recommendations</div>
          </div>
        </div>
      </Card> */}
    </div>
  );
};