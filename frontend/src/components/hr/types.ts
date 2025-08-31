export interface UploadedFile {
    file: File;
    error?: string;
}

export interface AnalysisResult {
    name: string;
    success: boolean;
    score?: number | null;
    report?: string;
    error?: string;
}
