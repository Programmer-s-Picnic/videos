"""Hello World Agent 1: observe, plan, act."""
import sys


def observe():
    return input("What should the agent do? ")


def plan(goal):
    goal = goal.lower()
    if goal in ("greet", "hello"):
        return "greet"
    if goal in ("show", "show time", "time"):
        return "show_time"
    if goal in ("stop", "quit", "exit"):

        return "stop"
    return "unknown"


def act(action):
    if action == "greet":
        return "Hello World! I am your first automation agent."
    if action == "show_time":
        from datetime import datetime

        return f"Current time: {datetime.now().strftime('%I:%M %p')}"
    if action == "stop":
        sys.exit()
        return "Agent stopped."
    return f"Sorry, I do not know how to complete that goal.Try something from {('greet', 'hello'), ("show", "show time", "time"), ("stop", "quit", "exit")}"


def agent():
    goal = observe()
    action = plan(goal)
    result = act(action)
    print("\nSelected action:", action)
    print("Result:", result)

while True:
        agent()
