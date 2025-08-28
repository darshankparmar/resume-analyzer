import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  FileText,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  file: File;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, className }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.8);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    setLoading(false);
    setError('Failed to load PDF. Please ensure the file is a valid PDF.');
    toast({
      title: "PDF Loading Error",
      description: "The PDF file could not be loaded. Please try uploading again.",
      variant: "destructive",
    });
  };

  const onPageLoadError = (error: Error) => {
    console.error('PDF page loading error:', error);
    toast({
      title: "Page Loading Error", 
      description: "Failed to load this page of the PDF.",
      variant: "destructive",
    });
  };

  const goToPrevious = () => {
    setPageNumber(page => Math.max(1, page - 1));
  };

  const goToNext = () => {
    setPageNumber(page => Math.min(numPages, page + 1));
  };

  const zoomIn = () => {
    setScale(scale => Math.min(2, scale + 0.2));
  };

  const zoomOut = () => {
    setScale(scale => Math.max(0.4, scale - 0.2));
  };

  const rotate = () => {
    setRotation(rotation => (rotation + 90) % 360);
  };

  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive mb-2">PDF Loading Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">
            {loading ? "Loading..." : `${pageNumber} of ${numPages}`}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={pageNumber <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={pageNumber >= numPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.4 || loading}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 2 || loading}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={rotate}
            disabled={loading}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="relative bg-muted/10">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading PDF...</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-center p-4 min-h-[400px] max-h-[600px] overflow-auto">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
            error=""
            className="shadow-md"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              onLoadError={onPageLoadError}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="border border-border"
              loading=""
              error=""
            />
          </Document>
        </div>
      </div>
    </Card>
  );
};