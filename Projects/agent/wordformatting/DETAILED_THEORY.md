# Agentic AI, Process Automation and the Word Formatting Agent

## 1. Why this subject matters

Most computer programs wait for an exact command. A calculator adds only when we press the correct key; a conventional script follows steps written in advance. Modern AI systems can accept a goal expressed in ordinary language, interpret it, form a plan, choose tools, observe results and continue until a stopping condition is reached. This goal-directed pattern is called agentic AI.

The important idea is not that every automation is intelligent. The useful progression is:

**manual work → fixed automation → configurable workflow → AI-assisted workflow → bounded autonomous agent**

Our Word project begins with deterministic automation and adds a small planning layer. This is pedagogically useful because students can see every part of the agent loop instead of hiding it behind a large language model.

## 2. Process and automation

A **process** is an ordered collection of activities that transforms an input into an output. It normally has a trigger, inputs, rules, actions, decision points, outputs and an owner.

For Word formatting:

- Trigger: a user provides a `.docx` file.
- Input: the file and a formatting instruction.
- Rules: valid fonts, sizes, margins and supported document elements.
- Actions: inspect runs, change formatting and save a new document.
- Output: a consistently formatted `.docx` file.
- Owner: the teacher, student or office user who verifies the result.

**Automation** means that software performs one or more process steps with reduced human effort. Good automation is repeatable, testable, observable and safe to rerun.

### Types of automation

1. **Task automation:** performs one narrow action, such as renaming a file.
2. **Rule-based automation:** follows explicit if–then conditions.
3. **Workflow automation:** coordinates several tasks and decision points.
4. **Robotic process automation:** imitates human interactions with existing user interfaces.
5. **Intelligent automation:** adds prediction, language understanding or document recognition.
6. **Agentic automation:** receives a goal, plans, uses tools, checks progress and decides what to do next within defined limits.

## 3. What is an AI agent?

An AI agent is a software system that operates on behalf of a user or another system to achieve a goal. It observes an environment, maintains relevant state, reasons or plans, performs actions through tools, evaluates results and stops, retries or escalates according to policy.

A compact model is:

**Agent = Goal + Perception + State + Reasoning + Tools + Feedback + Policy**

- **Goal:** the desired outcome.
- **Perception:** information read from the environment.
- **State or memory:** facts needed across steps.
- **Reasoning and planning:** selection and ordering of actions.
- **Tools:** controlled capabilities such as reading a file or calling an API.
- **Feedback:** observations returned after actions.
- **Policy and guardrails:** limits on what may be done.

An agent does not need to be completely autonomous. In useful business systems, bounded autonomy is usually preferable: the agent handles routine decisions but asks a human before irreversible or high-impact actions.

## 4. Automation, AI assistant and agent

| System | Main input | Decisions | Tool use | Feedback loop | Example |
|---|---|---|---|---|---|
| Fixed automation | Exact parameters | Pre-programmed | Fixed | Usually none | Set every run to TNR 14 |
| AI assistant | User prompt | Suggests content | Optional | User drives each turn | Suggest document styles |
| AI workflow | Prompt plus fixed stages | Limited inside stages | Orchestrated | Stage-level | Extract, classify, format |
| AI agent | Goal and constraints | Chooses next action | Dynamic but bounded | Repeats until done | Inspect, plan, format, validate |

The distinction is about control flow, not marketing language. If the path is entirely predetermined, it is a workflow. If the system can decide the next permitted action from observations, it behaves agentically.

## 5. The agent loop

The general loop is:

1. Receive the goal and constraints.
2. Observe the current environment.
3. Build or update a plan.
4. Select an allowed tool.
5. Execute the tool.
6. Observe the result or error.
7. Decide whether to continue, retry, ask for help or stop.
8. Return the result and an audit trail.

This is often written as **observe → think/plan → act → observe**. In production systems, “think” should become explicit structured state wherever possible. A validated `FormattingPlan` is safer and easier to test than arbitrary generated prose.

## 6. Agent architectures

### Reactive agent

Chooses an action directly from the current observation. It is fast but may struggle with long tasks.

### Plan-and-execute agent

Creates a sequence of steps, then executes them. It is easier to inspect but must re-plan when the environment changes.

### ReAct-style agent

Alternates reasoning and actions, using tool results to select the next step. It is flexible but requires strict limits to avoid unnecessary loops.

### Workflow with agentic nodes

Most business applications benefit from a deterministic workflow in which only uncertain stages use an agent. File validation and saving should remain deterministic; interpreting an unusual instruction may use an LLM.

### Multi-agent system

Several specialized agents collaborate, for example an intake agent, formatting agent and quality-control agent. This adds coordination cost and should be used only when specialization or parallel work produces clear value.

## 7. Tools and tool contracts

A tool is a controlled function exposed to the agent. Each tool needs a clear name, description, input schema, output schema, error behaviour and permission boundary.

For this project, conceptual tools include:

- `open_document(path)`
- `create_formatting_plan(instruction)`
- `format_text(font, size)`
- `format_headings(size, bold)`
- `set_line_spacing(value)`
- `set_margins(inches)`
- `save_copy(output_path)`
- `validate_output(path)`

Narrow tools are safer than allowing an agent to execute unrestricted code. Structured parameters can be checked before action.

## 8. Memory and state

**Working memory** holds the current goal, plan, file path and tool results. **Persistent memory** stores preferences or facts for future tasks. Our agent needs only working state represented by `FormattingPlan`.

Memory should be relevant, minimal, accurate and deletable. Storing entire private documents merely to remember a font preference would be unnecessary and risky.

## 9. Planning

Planning decomposes a goal into executable steps. A good plan is grounded in available tools, respects dependencies, contains completion criteria and can be revised after failure.

For “Format this report in Times New Roman 14, headings 16 bold, spacing 1.5” the plan is:

1. Validate that the input is a `.docx` file.
2. Open the document.
3. Traverse body paragraphs, tables, headers and footers.
4. Apply body formatting.
5. Detect heading styles and apply heading overrides.
6. Apply paragraph spacing and page margins.
7. Save to a new path.
8. Reopen or render the output for validation.

## 10. Deterministic and probabilistic components

Traditional code is deterministic: the same valid input normally produces the same result. Language models are probabilistic: their interpretation may vary. Reliable agentic systems combine both:

- Use an LLM where language is ambiguous.
- Convert its answer into a strict schema.
- Validate values against an allowlist and numeric ranges.
- Use deterministic code for file modification.
- Validate the resulting artifact.

The supplied classroom agent uses a deterministic instruction parser. This makes its capabilities limited but transparent, inexpensive and safe. An LLM can later replace only the parser, not the trusted execution layer.

## 11. Safety and governance

Useful agents require more than intelligence. They require control.

- **Least privilege:** expose only necessary tools and files.
- **Input validation:** reject unsupported or malformed files.
- **Output isolation:** create a new file rather than overwrite the original.
- **Allowlisted actions:** accept only supported fonts and properties.
- **Human approval:** request confirmation before destructive or external actions.
- **Limits:** cap file size, runtime, retries and tool calls.
- **Auditability:** record the instruction, plan, actions and outcome.
- **Privacy:** avoid sending document contents to external models unless authorised.
- **Prompt-injection resistance:** treat text inside a document as data, not as instructions.

## 12. Reliability and evaluation

An agent is successful only when the final process outcome is correct. Evaluation should cover:

- **Task success:** was the requested output produced?
- **Formatting accuracy:** were fonts, sizes and spacing applied correctly?
- **Coverage:** were tables, headers and footers included?
- **Preservation:** were images, text and the original file preserved?
- **Safety:** were unsupported inputs rejected?
- **Efficiency:** how many tool calls and how much time were required?
- **Recoverability:** are errors clear and can the user retry safely?

Test normal documents, multiple sections, nested tables, empty paragraphs, mixed runs, invalid paths, wrong extensions and corrupted files. Visual rendering remains important because technically valid Word XML may still produce poor layout.

## 13. End-to-end architecture of our project

1. The command line or Streamlit interface collects a file and instruction.
2. The instruction-understanding layer creates a `FormattingPlan`.
3. Validation checks the file and plan.
4. The document-observation layer traverses paragraphs, tables, headers and footers.
5. Formatting tools apply the plan to Word runs and sections.
6. The output layer saves a separate `.docx` file.
7. The user downloads and visually verifies the result.

## 14. Why Word documents require careful traversal

A Word document is not one continuous text string. Paragraphs contain **runs**, and each run may carry separate formatting. Tables contain cells, cells contain paragraphs, and cells may contain nested tables. Headers and footers are stored in section-specific parts. Therefore, formatting only `document.paragraphs` misses important content.

The agent sets both the high-level font property and Word's underlying `w:rFonts` declarations because different Word-compatible renderers may otherwise substitute a theme font.

## 15. User interface and deployment

The command-line version is ideal for teaching and automation. The Streamlit version provides file upload, an instruction field, a run button and a download button. It can run locally or on a suitable Python hosting service.

For organisational deployment, add authentication, malware scanning, file-size limits, temporary-file cleanup, logs without document contents, automated tests and a retention policy.

## 16. Extending this into a true LLM-powered agent

Ask an LLM to return only structured JSON such as:

```json
{
  "font_name": "Times New Roman",
  "body_size": 14,
  "heading_size": 16,
  "headings_bold": true,
  "line_spacing": 1.5,
  "margin_inches": 1.0
}
```

Then validate it before constructing `FormattingPlan`. Never allow model text to become unrestricted Python or shell commands. If the instruction requests an unsupported action, the system should explain the limitation or ask for clarification.

## 17. Completion checklist

- Install dependencies.
- Run the sample through the CLI.
- Compare `input.docx` and `formatted_demo.docx`.
- Run the Streamlit interface.
- Test at least one invalid file.
- Inspect body text, headings, tables, header and footer.
- Confirm the original remains unchanged.
- Complete one extension assignment.

## 18. Final perspective

Agentic AI is best understood as disciplined goal-directed software, not as a magical chatbot. A reliable agent combines flexible interpretation with deterministic tools, explicit state, tight permissions, feedback, validation and human control. The Word-formatting project is small enough to understand completely, yet it contains the same architectural ideas used in larger agents for customer support, report generation, data processing and operational workflows.

## 19. Viva and revision questions

- Define a process using the Word-formatting example.
- Distinguish task automation, workflow automation and agentic automation.
- What makes an agent different from a chatbot?
- State the seven components in the compact agent model.
- Why is bounded autonomy useful in business systems?
- Explain the observe–plan–act–observe loop.
- When should a deterministic workflow be preferred over an agent?
- Why should an LLM produce a validated schema instead of executable code?
- What is a tool contract?
- Why does our program process runs, tables, headers and footers separately?
- Name four safety controls required in a production agent.
- How would you measure the success of this agent?

## 20. Suggested practical extensions

- Add paragraph alignment and page-orientation tools.
- Process all Word documents in a selected folder.
- Add a preview and before/after formatting report.
- Detect headings that were formatted manually instead of using Word styles.
- Add organisation-specific profiles such as “school report” or “book manuscript.”
- Add an LLM parser that returns validated JSON.
- Add a quality-control step that reopens the output and reports coverage.
- Deploy the Streamlit interface with authentication and temporary-file cleanup.

## 21. Teacher’s closing summary

Start with a process, identify the repetitive steps, automate the certain parts, isolate the uncertain decision, expose narrow tools, represent the plan as structured data, validate every action, preserve the original input and measure the final outcome. This sequence turns an impressive demonstration into a dependable agentic system.
