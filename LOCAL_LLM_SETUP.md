# Local LLM Setup Guide

This guide explains how to run the AI Lead Generation system with a local LLM instead of using external API services.

## Current System Status

The AI Lead Generation system currently uses **rule-based pattern matching** rather than actual AI/LLM calls. The "AI analysis" is deterministic, searching for keywords and calculating scores based on patterns.

## Setting Up a Local LLM

### Option 1: Using Ollama (Recommended for OSS Models)

1. Install Ollama:
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh
```

2. Pull a large model (for 120B parameter models, you'll need significant RAM):
```bash
# For a 120B model (requires ~240GB RAM for full precision)
ollama pull llama2:70b  # More practical alternative

# Or use quantized versions
ollama pull mixtral:8x7b  # 47B parameters, more manageable
```

3. Run Ollama with OpenAI-compatible API:
```bash
ollama serve
```

### Option 2: Using LocalAI

1. Install LocalAI:
```bash
# Using Docker
docker run -p 8080:8080 -v $PWD/models:/models localai/localai:latest

# Or download binary
wget https://github.com/go-skynet/LocalAI/releases/latest/download/local-ai-Linux-x86_64
chmod +x local-ai-Linux-x86_64
./local-ai-Linux-x86_64
```

2. Download a model (example with GGUF format):
```bash
# Download a quantized model
wget https://huggingface.co/TheBloke/Llama-2-70B-Chat-GGUF/resolve/main/llama-2-70b-chat.Q4_K_M.gguf -P models/
```

### Option 3: Using Text Generation WebUI

1. Clone and setup:
```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
python -m pip install -r requirements.txt
```

2. Download model through the UI or manually place in `models/` directory

3. Run with API enabled:
```bash
python server.py --api --listen
```

## Configuration

Add these environment variables to your `.env` file:

```env
# Local LLM Configuration
LLM_PROVIDER=local
LLM_BASE_URL=http://localhost:8080
LLM_MODEL=oss-120b
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7

# Disable external APIs
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

## Enhanced Analysis with LLM

To actually use the LLM for analysis (instead of pattern matching), you would need to:

1. Implement real web scraping for job boards and OSINT data
2. Integrate the LLM provider into the Horsemen analysis pattern
3. Replace pattern matching with LLM-based analysis

Example integration in `src/services/research/horsemen/analyzers/job-postings.ts`:

```typescript
import { getLLMProvider } from '@/lib/llm';

export async function analyzeJobPostings(context: OsintContext): Promise<Finding[]> {
  const llm = getLLMProvider();
  
  // Use LLM to analyze job postings
  const analysis = await llm.analyzeContext(context, `
    Analyze these job postings for automation opportunities.
    Focus on repetitive tasks, manual processes, and high-volume operations.
    Identify specific roles that could benefit from AI automation.
  `);
  
  // Extract structured findings
  const findings = await llm.extractFindings(analysis);
  
  return findings;
}
```

## Performance Considerations

- **120B models** require ~240GB RAM for full precision
- **Quantized versions** (4-bit) reduce to ~60-80GB RAM
- **Response time** will be slower than API services
- Consider using smaller models (7B-70B) for faster inference

## Alternative: Hybrid Approach

You can use a smaller local model for initial analysis and pattern matching, while keeping the option to use external APIs for complex reasoning tasks.

## Current Limitations

1. **No actual web scraping** - All data sources return mock data
2. **No LLM integration** - Analysis is rule-based pattern matching
3. **Missing API integrations** - Job boards, news, tech stack APIs not implemented

To make this a fully functional local AI lead generation system, you would need to:
1. Implement actual web scraping (using Puppeteer, Playwright, or APIs)
2. Integrate the local LLM for real analysis
3. Add data persistence beyond in-memory caching
4. Implement real company research capabilities