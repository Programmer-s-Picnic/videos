from pathlib import Path
from tempfile import TemporaryDirectory

import streamlit as st

from word_format_agent import apply_plan, understand_instruction


st.set_page_config(page_title="Word Formatting Agent", page_icon="📄", layout="centered")
st.title("Word Formatting Agent")
st.write("Upload a `.docx` file, describe the formatting, and download a newly formatted copy.")

uploaded = st.file_uploader("Word document", type=["docx"])
instruction = st.text_area(
    "Formatting instruction",
    "Times New Roman size 14, headings 16 bold, line spacing 1.5, normal margins",
)

if st.button("Run agent", type="primary", disabled=uploaded is None):
    try:
        with TemporaryDirectory() as tmp:
            input_path = Path(tmp) / "input.docx"
            output_path = Path(tmp) / "formatted.docx"
            input_path.write_bytes(uploaded.getvalue())
            plan = understand_instruction(instruction)
            apply_plan(input_path, output_path, plan)
            result = output_path.read_bytes()

        st.success("Formatting complete. Your original file was not changed.")
        st.code(str(plan), language=None)
        st.download_button(
            "Download formatted document",
            data=result,
            file_name=f"formatted_{uploaded.name}",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as error:
        st.error(f"The document could not be processed: {error}")
