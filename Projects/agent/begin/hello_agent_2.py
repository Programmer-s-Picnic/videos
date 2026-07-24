"""Hello World Agent 2: create a multi-step plan and use tools."""

from datetime import datetime
from pathlib import Path


WORKSPACE = Path("agent_workspace")


def understand_goal(goal):
    goal = goal.lower()
    if "create" in goal and "hello" in goal:
        return [
            {"tool": "create_folder"},
            {
                "tool": "write_file",
                "filename": "hello.txt",
                "content": "Hello World from my automation agent!",
            },
            {"tool": "read_file", "filename": "hello.txt"},
        ]
    if "report" in goal:
        return [
            {"tool": "create_folder"},
            {
                "tool": "write_file",
                "filename": "report.txt",
                "content": (
                    "Agent Automation Report\n"
                    f"Created: {datetime.now()}\n"
                    "Status: Successfully completed"
                ),
            },
            {"tool": "read_file", "filename": "report.txt"},
        ]
    return []


def create_folder():
    WORKSPACE.mkdir(exist_ok=True)
    return f"Folder ready: {WORKSPACE}"


def write_file(filename, content):
    path = WORKSPACE / filename
    path.write_text(content, encoding="utf-8")
    return f"File created: {path}"


def read_file(filename):
    path = WORKSPACE / filename
    if not path.exists():
        return f"File not found: {path}"
    return f"Content of {path}:\n{path.read_text(encoding='utf-8')}"


def use_tool(step):
    tool_name = step["tool"]
    if tool_name == "create_folder":
        return create_folder()
    if tool_name == "write_file":
        return write_file(step["filename"], step["content"])
    if tool_name == "read_file":
        return read_file(step["filename"])
    return f"Unknown tool: {tool_name}"


def agent(goal):
    print("Goal:", goal)
    plan = understand_goal(goal)
    if not plan:
        print("The agent cannot complete this goal.")
        return

    print("\nPlan:")
    for number, step in enumerate(plan, start=1):
        print(f"{number}. {step['tool']}")

    print("\nExecuting plan:")
    for step in plan:
        print(use_tool(step))
    print("\nGoal completed successfully.")


if __name__ == "__main__":
    agent(input("Enter your goal: "))
