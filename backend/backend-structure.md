# Resume Analyzer Backend

This document defines a single, stateless API endpoint for analyzing a resume. No databases, sessions, or additional features are included.

---

### **Resume Analysis API (Single Endpoint)**

```http
POST /api/v1/analyze-resume
Content-Type: multipart/form-data
```

#### **Request Body**

- `resume`: File (PDF, max 10MB, required)
- `jobTitle`: String (required)
- `jobDescription`: String (optional)
- `jobLink`: URL (optional)

Example:

```json
{
  "resume": "<PDF file>",
  "jobTitle": "Senior Software Engineer",
  "jobDescription": "Optional text...",
  "jobLink": "https://company.com/careers/123"
}
```

---

#### **Success Response (200)**

```json
{
  "success": true,
  "data": {
    "analysisReport": "# Resume Analysis Report\n\n## Overall Match Score: 85%..."
  },
  "message": "Analysis completed successfully"
}
```

---

#### **Error Responses**

1. **File too large**

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 10MB limit",
    "details": { "maxSize": "10MB", "receivedSize": "15MB" }
  }
}
```

2. **Invalid file type**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "Only PDF files are allowed",
    "details": { "allowedTypes": ["application/pdf"] }
  }
}
```

3. **Corrupted PDF**

```json
{
  "success": false,
  "error": {
    "code": "CORRUPTED_PDF",
    "message": "PDF file appears to be corrupted",
    "details": { "reason": "Unable to extract text content" }
  }
}
```

4. **Text extraction failed (image-based PDF)**

```json
{
  "success": false,
  "error": {
    "code": "TEXT_EXTRACTION_FAILED",
    "message": "Could not extract text from PDF",
    "details": { "reason": "PDF may be image-based or corrupted" }
  }
}
```

5. **Analysis failed (AI issue)**

```json
{
  "success": false,
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "Failed to analyze resume content",
    "details": { "reason": "AI service unavailable", "retryAfter": "30s" }
  }
}
```

6. **Missing required fields**

```json
{
  "success": false,
  "error": {
    "code": "MISSING_FIELDS",
    "message": "Required fields are missing",
    "details": { "missing": ["jobTitle", "resume"] }
  }
}
```

7. **Invalid job link**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_JOB_LINK",
    "message": "Job link must be a valid URL",
    "details": { "received": "htp:/bad-url" }
  }
}
```

8. **Internal server error**

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred while processing your request",
    "details": { "traceId": "uuid-v4" }
  }
}
```
