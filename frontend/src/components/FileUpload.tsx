import React, { useCallback, useState } from "react";
import { Upload, File, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PDFViewer } from "@/components/PDFViewer";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { UploadedFile } from "@/pages/Index";

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFile: UploadedFile | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, uploadedFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file only",
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const removeFile = () => {
    onFileUpload(null as any);
  };

  if (uploadedFile) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-accent/50 border-accent">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">{uploadedFile.size}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* PDF Preview */}
        <PDFViewer 
          file={uploadedFile.file} 
          className="aspect-[3/4]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
        isDragOver 
          ? "border-primary bg-primary/5" 
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
          <Upload className="h-8 w-8" />
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Upload your resume</h3>
          <p className="text-sm text-muted-foreground">
            Drag & drop your PDF file here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: 10MB • PDF only
          </p>
        </div>

        <label htmlFor="file-upload">
          <Button variant="outline" className="cursor-pointer" asChild>
            <span>
              <File className="h-4 w-4 mr-2" />
              Browse Files
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
    </div>
  );
};