"""
LangGraph pipeline definition.

Wires all nodes together:
  START → jd_parser → job_selector → bullet_selector → ai_suggestion_gen
       → latex_assembler → compile_latex → qa_critic → END (or retry)

The qa_critic can route back to bullet_selector up to 3 times.
"""

from langgraph.graph import StateGraph, END

from src.state import ResumeState
from src.nodes.jd_parser import jd_parser
from src.nodes.job_selector import job_selector
from src.nodes.bullet_selector import bullet_selector
from src.nodes.ai_suggestion_gen import ai_suggestion_gen
from src.nodes.latex_assembler import latex_assembler
from src.nodes.compile_latex import compile_latex
from src.nodes.qa_critic import qa_critic


def _should_retry(state: dict) -> str:
    """Decide whether to retry (route back to bullet_selector) or accept."""
    qa_feedback = state.get("qa_feedback")
    retry_count = state.get("retry_count", 0)

    # Pass — no feedback means QA passed
    if not qa_feedback:
        return "accept"

    # Retry limit reached — accept whatever we have
    if retry_count >= 3:
        print(f"\n⚠️  Max retries ({retry_count}) reached. Accepting current output.")
        return "accept"

    # Has feedback and retries remaining — loop back
    print(f"\n🔄 Retrying (attempt {retry_count}/3) — routing back to bullet selector...")
    return "retry"


def build_graph() -> StateGraph:
    """Build and compile the LangGraph pipeline."""
    graph = StateGraph(ResumeState)

    # Add nodes
    graph.add_node("jd_parser", jd_parser)
    graph.add_node("job_selector", job_selector)
    graph.add_node("bullet_selector", bullet_selector)
    graph.add_node("ai_suggestion_gen", ai_suggestion_gen)
    graph.add_node("latex_assembler", latex_assembler)
    graph.add_node("compile_latex", compile_latex)
    graph.add_node("qa_critic", qa_critic)

    # Linear edges
    graph.set_entry_point("jd_parser")
    graph.add_edge("jd_parser", "job_selector")
    graph.add_edge("job_selector", "bullet_selector")
    graph.add_edge("bullet_selector", "ai_suggestion_gen")
    graph.add_edge("ai_suggestion_gen", "latex_assembler")
    graph.add_edge("latex_assembler", "compile_latex")
    graph.add_edge("compile_latex", "qa_critic")

    # Conditional edge: QA can loop back or finish
    graph.add_conditional_edges(
        "qa_critic",
        _should_retry,
        {
            "retry": "bullet_selector",
            "accept": END,
        },
    )

    return graph.compile()


# Pre-compiled graph — import this from main.py
app = build_graph()
