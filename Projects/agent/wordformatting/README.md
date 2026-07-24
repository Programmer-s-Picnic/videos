# Word Formatting Agent

A beginner-friendly Python project that reads an instruction and formats a `.docx` file.

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS/Linux, activate with `source .venv/bin/activate`.

## Fastest use: Times New Roman 14

Put your document in this folder as `input.docx`, then run:

```bash
python word_format_agent.py input.docx formatted.docx
```

## Natural-language instruction

```bash
python word_format_agent.py input.docx formatted.docx --instruction "Times New Roman size 14, headings 16 bold, line spacing 1.5, normal margins"
```

The program processes normal paragraphs, tables, nested tables, headers and footers. Images and other document content are preserved.

## Graphical upload/download interface

```bash
streamlit run streamlit_app.py
```

Your browser will open the Word Formatting Agent. Upload a `.docx`, enter an instruction, run the agent and download the new file.

For the complete conceptual explanation, read `DETAILED_THEORY.md` and `AI_Automation_Agent_Complete_Lesson.docx`.

## Agent loop

1. **Goal:** The user supplies a formatting instruction.
2. **Observe:** The program opens and inspects the Word document.
3. **Plan:** `understand_instruction()` creates a `FormattingPlan`.
4. **Act:** Formatting tools change runs, paragraphs, tables and page margins.
5. **Result:** A new `.docx` file is saved, leaving the original untouched.

## Classroom extension ideas

- Add a graphical upload/download interface with Streamlit.
- Add PDF conversion through LibreOffice.
- Add spelling and grammar checks.
- Process every `.docx` file in a folder.
- Connect an LLM so free-form instructions can produce validated JSON plans.

## Important limitation

The included instruction parser is deliberately safe and deterministic. It understands a small set of formatting commands; it is not a general-purpose language model.
