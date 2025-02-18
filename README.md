# Educational Content Processing System (ECPS)

## System Architecture

### Frontend (React + TypeScript)
- React Query for data fetching and caching
- Tailwind CSS for styling
- Real-time updates via Supabase subscriptions
- File upload with drag-and-drop support
- Markdown rendering for lesson content

### Backend (Supabase)
- PostgreSQL database with Row Level Security
- Edge Functions for AI processing
- Real-time subscriptions
- Storage for document handling
- Built-in authentication

### AI Processing Pipeline
- NVIDIA AI models for all processing
- Rate limiting and request queuing
- Error handling and retry logic
- Monitoring and metrics collection

### Storage
- Supabase Storage for file handling
- PostgreSQL for structured data
- Automatic backup and cleanup

## LangGraph Integration

### Why Use LangGraph?
LangGraph allows for the creation of **dynamic AI workflows** using graph-based execution logic. This enhances our **agent-based processing pipeline**, ensuring efficient **parallel execution, real-time feedback loops, and structured orchestration**.

### How LangGraph is Used in ECPS
- **Workflow Orchestration**  
  - Defines AI agent interactions as a directed graph.
  - Allows for conditional branching and dynamic content routing.
- **Parallel Processing of AI Agents**  
  - Multiple AI models process content simultaneously.
  - Example: **Segmentation & Categorization run in parallel**, while **Quality Scoring waits for completion**.
- **Automatic Rerouting for Refinement**  
  - If a lesson does not meet the **quality threshold**, it is automatically sent to the **Refinement Agent**.
- **Real-Time AI Execution Monitoring**  
  - Enables tracking of **where a lesson is in the pipeline**.

### LangGraph Workflow Example
\`\`\`typescript
import { Graph } from 'langgraph';

// Define AI processing workflow
const lessonProcessingGraph = new Graph();

// Step 1: Content Segmentation
lessonProcessingGraph.addNode('segmentation', async (lesson) => {
  return await segmentLesson(lesson);
});

// Step 2: Categorization & Quality Evaluation (Parallel)
lessonProcessingGraph.addNode('categorization', async (lesson) => {
  return await categorizeLesson(lesson);
});
lessonProcessingGraph.addNode('qualityCheck', async (lesson) => {
  return await evaluateQuality(lesson);
});

// Step 3: Conditional Refinement
lessonProcessingGraph.addEdge('qualityCheck', 'refinement', (qualityScore) => {
  return qualityScore < 70; // If score is low, refine the lesson
});

// Step 4: Publishing
lessonProcessingGraph.addNode('publishing', async (lesson) => {
  return await publishLesson(lesson);
});

// Execute workflow
lessonProcessingGraph.execute(lesson);
\`\`\`

## Core Rules

### 1. Content Processing
- Document Constraints:
  - Max size: 10MB
  - Formats: PDF, DOC, DOCX
  - Min content: 200 characters
- Lesson Categories:
  - Core
  - Supplementary
  - Exploratory
- Quality Requirements:
  - Min score: 70%
  - Min reading time: 1 minute

### 2. AI Processing
- Quality Thresholds:
  - Acceptable: ≥70%
  - Needs refinement: 50-69%
  - Requires rewrite: <30%
- Rate Limits:
  - 8000 tokens/request
  - 5 concurrent requests
  - 60 requests/minute
  - 90,000 tokens/minute
- Retry Logic:
  - Max 3 attempts
  - Exponential backoff
  - Initial delay: 1s
  - Max delay: 10s

### 3. User Interaction
- Authentication:
  - Email-based
  - Min password: 6 chars
  - Max login attempts: 5
  - Lockout: 15 minutes
- Rate Limits:
  - 20 uploads/hour
  - 100 processing requests/day
  - 5-minute cooldown
- Access Control:
  - Users can only access own content
  - Row Level Security enforced

### 4. Storage
- File Handling:
  - 10MB limit
  - PDF, DOC, DOCX
  - 24-hour expiry
- Content Storage:
  - Max lesson: 100KB
  - Max metadata: 16KB
  - Daily backups
  - Structured path: {userId}/{timestamp}-{filename}

## AI Agents and Model Mapping

| Agent                        | Function                                         | Model Name                                   | Use Case                                       | API Base URL                                       |
|------------------------------|-------------------------------------------------|----------------------------------------------|-----------------------------------------------|----------------------------------------------------|
| **OCR Agent**                | Extract text from PDFs & images                 | nvidia/ocdrnet                              | Optical Character Recognition (OCR)           | https://ai.api.nvidia.com/v1/cv/nvidia/ocdrnet    |
| **Lesson Segmentation Agent** | Break content into 5-minute lessons            | nvidia/llama-3.2-nv-embedqa-1b-v2           | Text-to-Embedding                            | https://integrate.api.nvidia.com/v1               |
| **Knowledge Base Agent**      | Check lesson redundancy                        | nvidia/llama-3.2-nv-embedqa-1b-v2           | Text-to-Embedding                            | https://integrate.api.nvidia.com/v1               |
| **Categorization Agent**      | Classify lessons as Core, Supplementary, etc.  | nvidia/llama-3.2-nv-rerankqa-1b-v2          | Retrieval Augmented Generation (RAG)        | https://ai.api.nvidia.com/v1/retrieval/           |
| **Completeness & Routing Agent** | Identify missing lesson components       | nvidia/llama-3.2-nv-rerankqa-1b-v2          | Retrieval Augmented Generation (RAG)        | https://ai.api.nvidia.com/v1/retrieval/           |
| **Deconstructor Agent**       | Break large lessons into structured parts      | nvidia/llama-3.2-nv-embedqa-1b-v2           | Text-to-Embedding                            | https://integrate.api.nvidia.com/v1               |
| **Innovator Agent**           | Add storytelling, engagement                   | nvidia/nemotron-4-340b-instruct             | Synthetic Data Generation                     | https://integrate.api.nvidia.com/v1               |
| **Integrator Agent**          | Ensure logical flow between lessons            | nvidia/llama-3.2-nv-rerankqa-1b-v2          | Retrieval Augmented Generation (RAG)        | https://ai.api.nvidia.com/v1/retrieval/           |
| **Analyzer Agent**            | Validate references, check accuracy, web scrape | deepseek-ai/deepseek-r1                     | General Purpose AI, Complex QA                | https://integrate.api.nvidia.com/v1               |
| **Merge & Final Decision Agent** | Aggregate and finalize lessons          | nvidia/llama-3.2-nv-rerankqa-1b-v2          | Retrieval Augmented Generation (RAG)        | https://ai.api.nvidia.com/v1/retrieval/           |
| **Publisher Agent**           | Format & export lessons to LMS                 | nvidia/nemotron-4-340b-instruct             | Synthetic Data Generation                     | https://integrate.api.nvidia.com/v1               |

## Security

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Policies enforce ownership checks

### API Security
- JWT authentication
- Rate limiting
- Request validation
- Error handling

### Data Protection
- Automatic backups
- Content versioning
- Soft deletes
- Audit logging

## Quick Reference

\`\`\`typescript
// Check content quality
if (qualityScore < rules.ai.quality.minAcceptableScore) {
  await refineContent(lessonId);
}

// Validate file upload
if (fileSize > rules.storage.files.maxSizeBytes) {
  throw new Error('File too large');
}

// Check rate limits
if (userUploads > rules.user.rateLimit.maxUploadsPerHour) {
  throw new Error('Upload limit reached');
}
\`\`\`

For detailed implementation, see:
- `src/config/rules.ts` - Application rules
- `src/services/ai/` - AI service implementations
- `src/lib/nvidia.ts` - NVIDIA integration
- `supabase/migrations/` - Database schema