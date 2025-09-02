import React, { useCallback, useState } from "react";
import { Upload, File, X, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PDFViewer } from "@/components/PDFViewer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { UploadedFile } from "@/pages/Individual";

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFile: UploadedFile | null;
  onRemove?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  uploadedFile,
  onRemove,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      toast({
        title: "❌ Invalid file type",
        description: "Please upload a PDF file only",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      toast({
        title: "❌ File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;

    const uploadedFile: UploadedFile = {
      file,
      name: file.name,
      size: formatFileSize(file.size),
    };

    onFileUpload(uploadedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setIsDragOver(false);
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    setShowPreview(false);
    // Notify parent to clear the uploaded file
    onRemove?.();
    toast({
      title: "Removed",
      description: "Resume cleared. Upload another file.",
    });
  };

  if (uploadedFile) {
    return (
      <div className="space-y-4">
        {/* Success Card */}
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-900 truncate">
                {uploadedFile.name}
              </p>
              <p className="text-sm text-green-700">
                {uploadedFile.size} • PDF
              </p>
            </div>
            <div className="flex gap-2">
              {/* <Button
								variant="ghost"
								size="sm"
								onClick={() => setShowPreview(!showPreview)}
								className="text-green-700 hover:bg-green-100 rounded-lg"
							>
								<Eye className="h-4 w-4" />
							</Button> */}
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* PDF Preview Toggle */}
        {showPreview && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <PDFViewer
              file={uploadedFile.file}
              className="rounded-xl border-0 shadow-lg overflow-hidden"
            />
          </div>
        )}

        {/* Quick Upload Another */}
        <Button
          variant="outline"
          onClick={removeFile}
          className="w-full rounded-xl border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-600 font-medium"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Different Resume
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group w-full",
        isDragOver
          ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg transform scale-[1.02]"
          : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Upload Icon with Animation */}
        <div
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
            isDragOver
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl transform scale-110"
              : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-indigo-100"
          )}
        >
          <Upload
            className={cn(
              "h-10 w-10 transition-all duration-300",
              isDragOver
                ? "text-white animate-bounce"
                : "text-gray-500 group-hover:text-blue-600"
            )}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-900">
            {isDragOver ? "Drop your resume here!" : "Upload your resume"}
          </h3>
          <p className="text-gray-600 max-w-sm">
            Drag & drop your PDF resume here, or click the button below to
            browse files
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <FileText className="h-3 w-3" />
            <span>PDF only • Max 10MB</span>
          </div>
        </div>

        {/* Upload Button */}
        <label htmlFor="file-upload" className="cursor-pointer">
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            asChild
          >
            <span>
              <File className="h-5 w-5 mr-2" />
              Choose File
            </span>
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-2xl border-2 border-blue-500 flex items-center justify-center">
          <div className="text-blue-700 font-semibold text-lg">
            Release to upload
          </div>
        </div>
      )}
    </button>
  );
};
