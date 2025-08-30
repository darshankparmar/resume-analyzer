import React, { useState, useRef, useEffect } from "react";
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
  Maximize2,
  Minimize2,
  X
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
  const [scale, setScale] = useState<number>(0.9);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isControlsVisible, setIsControlsVisible] = useState<boolean>(true);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls on mobile after inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setIsControlsVisible(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    };

    if (containerRef.current && window.innerWidth < 768) {
      const container = containerRef.current;
      container.addEventListener('touchstart', resetControlsTimeout);
      container.addEventListener('mousemove', resetControlsTimeout);

      return () => {
        container.removeEventListener('touchstart', resetControlsTimeout);
        container.removeEventListener('mousemove', resetControlsTimeout);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    }
  }, []);

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
      title: "❌ PDF Loading Error",
      description: "The PDF file could not be loaded. Please try uploading again.",
      variant: "destructive",
    });
  };

  const onPageLoadError = (error: Error) => {
    console.error('PDF page loading error:', error);
    toast({
      title: "❌ Page Loading Error",
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
    setScale(scale => Math.min(2.5, scale + 0.2));
  };

  const zoomOut = () => {
    setScale(scale => Math.max(0.3, scale - 0.2));
  };

  const rotate = () => {
    setRotation(rotation => (rotation + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setScale(1.2);
    } else {
      setScale(0.9);
    }
  };

  if (error) {
    return (
      <Card className={cn("p-8 rounded-2xl border-0 shadow-lg", className)}>
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900 mb-2">PDF Loading Error</h3>
            <p className="text-red-700 max-w-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50"
          >
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const ControlBar = () => (
    <div className={cn(
      "flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-gray-200/50 transition-all duration-300",
      isFullscreen && "absolute top-0 left-0 right-0 z-10",
      !isControlsVisible && isFullscreen && "opacity-0 pointer-events-none"
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-gray-900">
            {loading ? "Loading..." : `Page ${pageNumber} of ${numPages}`}
          </span>
          <div className="text-xs text-gray-500">
            {Math.round(scale * 100)}% zoom
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Navigation */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevious}
            disabled={pageNumber <= 1 || loading}
            className="rounded-lg hover:bg-blue-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNext}
            disabled={pageNumber >= numPages || loading}
            className="rounded-lg hover:bg-blue-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.3 || loading}
            className="rounded-lg hover:bg-blue-50"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 2.5 || loading}
            className="rounded-lg hover:bg-blue-50"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Additional Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={rotate}
          disabled={loading}
          className="rounded-lg hover:bg-blue-50"
        >
          <RotateCw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          className="rounded-lg hover:bg-blue-50"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>

        {isFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="rounded-lg hover:bg-red-50 text-red-600 ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const PDFContent = () => (
    <div className="relative bg-gradient-to-br from-gray-50 to-gray-100">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 rounded-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-lg font-medium text-gray-700">Loading PDF...</span>
          </div>
        </div>
      )}

      <div className={cn(
        "flex justify-center p-4 overflow-auto",
        isFullscreen
          ? "min-h-screen max-h-screen pt-20"
          : "min-h-[300px] max-h-[500px] sm:max-h-[600px]"
      )}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          error=""
          className="drop-shadow-xl"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            onLoadError={onPageLoadError}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="border border-gray-300 rounded-lg bg-white shadow-lg"
            loading=""
            error=""
          />
        </Document>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm">
        <div className="h-full flex flex-col">
          <ControlBar />
          <PDFContent />
        </div>

        {/* Mobile Page Navigation */}
        <div className={cn(
          "absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-lg transition-all duration-300",
          !isControlsVisible && "opacity-0 pointer-events-none"
        )}>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToPrevious}
            disabled={pageNumber <= 1}
            className="rounded-xl"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <span className="text-lg font-semibold text-gray-900 px-4">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToNext}
            disabled={pageNumber >= numPages}
            className="rounded-xl"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden rounded-2xl border-0 shadow-lg", className)} ref={containerRef}>
      <ControlBar />
      <PDFContent />
    </Card>
  );
};