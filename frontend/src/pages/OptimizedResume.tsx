import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Download,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";

type LocationState = {
  optimizedJson?: string;
  jobTitle?: string;
  timestamp?: string;
};

const OptimizedResumePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const jsonText = state.optimizedJson || "";
  const jobTitle = state.jobTitle || "Optimized Resume";
  const ts = state.timestamp || new Date().toISOString();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      alert("JSON copied to clipboard");
    } catch (e) {
      console.error("Copy failed", e);
      alert("Copy failed. Please copy manually.");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobTitle
        .replace(/\s+/g, "-")
        .toLowerCase()}-rxresume.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
      alert("Download failed. Try copy instead.");
    }
  };

  if (!jsonText) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <AppHeader />
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <Card className="p-8 max-w-3xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-2">No resume generated</h1>
            <p className="text-gray-600 mb-6">
              Go back and generate an optimized resume first.
            </p>
            <Button onClick={() => navigate("/individual")}>Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <AppHeader />
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200/50 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Optimized Resume JSON
                  </h2>
                  <p className="text-sm text-gray-600">
                    {new Date(ts).toLocaleString()} • {jobTitle}
                  </p>
                </div>
              </div>
              <Badge className="rounded-full bg-blue-100 text-blue-800 border-blue-200">
                Ready to import
              </Badge>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <div className="text-gray-700 text-sm">Preview (read-only)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate("/individual")}
                  className="order-3 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="order-1 sm:order-2"
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="order-2 sm:order-3"
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button
                  className="order-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0"
                  onClick={() => window.open("https://rxresu.me/", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Open rxresu.me
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 overflow-auto max-h-[70vh]">
              <pre className="p-4 text-sm leading-6 whitespace-pre-wrap break-words">
                {JSON.stringify(JSON.parse(jsonText), null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OptimizedResumePage;
