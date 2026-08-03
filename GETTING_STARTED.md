# Getting Started — AI Resume Tailor (Phase 1)

This guide walks you through setting up and running the local pipeline POC.

---

## Prerequisites

### Python 3.11+
Verify your Python version:
```bash
python3 --version
```
If you need to install or upgrade, use [pyenv](https://github.com/pyenv/pyenv) or download from [python.org](https://www.python.org/downloads/).

### OpenRouter Account + API Key
1. Create an account at [https://openrouter.ai](https://openrouter.ai).
2. Navigate to **Keys** in your dashboard and create a new API key.
3. Add a small amount of credits ($5 is more than enough for extensive testing — each pipeline run costs a fraction of a cent).

### Tectonic (LaTeX Compiler)

Tectonic is a lightweight, self-contained LaTeX engine. It downloads and caches only the packages your document needs — no full TeX Live install required.

**macOS (Homebrew):**
```bash
brew install tectonic
```

**Windows / Linux:**
Download the official binary from [https://tectonic-typesetting.github.io](https://tectonic-typesetting.github.io/en-US/install.html) and add it to your PATH.

**Verify installation:**
```bash
tectonic --version
```

---

## Setup

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd ai-resume-tailor
```

### 2. Create a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate    # macOS/Linux
# .venv\Scripts\activate     # Windows
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
```

Open `.env` and fill in your values:
```
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
OPENROUTER_MODEL=deepseek/deepseek-chat
```

The `OPENROUTER_MODEL` can be any model available on OpenRouter. The default (`deepseek/deepseek-chat`) is cheap and capable. Other good options:
- `meta-llama/llama-4-maverick` — strong open model
- `openai/gpt-4o-mini` — if you prefer OpenAI-family models

---

## Running the Pipeline

### Basic usage
```bash
python main.py --jd data/sample_jd_backend.txt
```

### With the alternative sample JD
```bash
python main.py --jd data/sample_jd_data_ml.txt
```

### What you should see

The console will print a step-by-step status log as each LangGraph node executes:

```
[jd_parser] Parsed JD: 8 required skills, 12 keywords, seniority=mid-level
[bullet_selector] Selected 4 jobs/1 projects, 17 bullets total (retry 0)
[latex_assembler] Rendered LaTeX: 4823 chars
[compile_latex] Compilation succeeded, 2 page(s)
[qa_critic] FAIL: 2 pages, retrying (1/3)
[bullet_selector] Selected 4 jobs/1 projects, 14 bullets total (retry 1)
[latex_assembler] Rendered LaTeX: 4102 chars
[compile_latex] Compilation succeeded, 1 page(s)
[qa_critic] PASS: 1 page

✅ Pipeline complete!
   PDF: output/resume.pdf
   Selection report: output/selection_report.json
   Pages: 1
   Retries: 1
   Status: success
```

### Output files

| File | Description |
|---|---|
| `output/resume.pdf` | The tailored one-page resume |
| `output/selection_report.json` | Full selection data including every chosen bullet and its `reason` — preview of the future suggestion UI |

---

## Troubleshooting

### "tectonic: command not found"
Tectonic is not on your PATH. Re-run the install command above, or check that the binary location is in your shell's `$PATH`.

### "Error: OPENROUTER_API_KEY not set"
Make sure you've copied `.env.example` to `.env` and filled in your actual API key. The key should start with `sk-or-`.

### "OpenRouter: insufficient credits"
Add credits at [https://openrouter.ai/credits](https://openrouter.ai/credits). Pipeline runs cost < $0.01 each with the default model.

### "LaTeX compilation failed"
Check the console output for the specific LaTeX error. Common causes:
- Missing closing braces in bullet text (the escaping should handle this, but edge cases exist)
- Extremely long bullet text that overflows a single line

### First run is slow
Tectonic downloads and caches LaTeX packages on its first run. Subsequent runs are much faster.
