# Build Your First Process-Automation Agent in Python

## Project

Convert any Word document to Times New Roman, size 14, and accept extra instructions for headings, line spacing and margins.

## Learning outcomes

By the end of the class, students can explain automation versus an agent, open and edit `.docx` files, create a structured plan from a user instruction, apply tools to paragraphs/tables/headers/footers, and preserve the original file.

## Suggested 75-minute flow

1. **0–10 min — The problem:** Reformatting reports manually is repetitive and error-prone.
2. **10–20 min — Automation vs agent:** A fixed script follows one recipe; an agent receives a goal, creates a plan and chooses tools.
3. **20–30 min — Word document structure:** Document → sections → paragraphs/tables → runs.
4. **30–50 min — Live coding:** Build `FormattingPlan`, instruction parser, font tool and traversal functions.
5. **50–60 min — Test:** Run the default TNR 14 command, then add heading and spacing instructions.
6. **60–70 min — Agent loop:** Goal → observe → plan → act → result.
7. **70–75 min — Assignment and recap.**

## Board explanation

```text
User instruction
      ↓
Understand instruction
      ↓
FormattingPlan
      ↓
Select tools
      ↓
Edit a copy of the Word file
      ↓
Formatted document
```

## Demonstration commands

```bash
python word_format_agent.py input.docx formatted.docx
python word_format_agent.py input.docx formatted.docx --instruction "Times New Roman size 14, headings 16 bold"
python word_format_agent.py input.docx formatted.docx --instruction "Arial size 12, line spacing 1.5, normal margins"
```

## Questions to ask students

1. Why does Word divide paragraph text into runs?
2. Why do we process tables, headers and footers separately?
3. Why should the agent create a new file instead of overwriting the input?
4. Which part is planning, and which part is tool execution?
5. How could we validate an LLM-generated formatting plan?

## Assignment

Add one feature: paragraph alignment, page orientation, bulk-folder processing, or a simple Streamlit interface. Validate file type and keep the original file unchanged.

## YouTube assets

**Title:** Build Your First AI Automation Agent in Python | Format Word Documents Automatically

**Description:** Learn how to build a beginner-friendly process-automation agent in Python. The project reads formatting instructions and converts Word documents to Times New Roman, size 14, while also supporting headings, line spacing and margins. We use python-docx and explain the complete agent loop: goal, observation, planning, tool selection, action and result.

**Tags:** agentic AI, AI agent Python, process automation, Python automation, Word automation, python-docx, format Word document, Times New Roman, beginner Python project, Programmer's Picnic, Champak Roy
