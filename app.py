import streamlit as st
from agents.analyzer import analyzer_agent
from agents.feasibility import feasibility_agent
from agents.governance import governance_agent
from agents.improver import improver_agent

st.set_page_config(page_title="IdeaGuard AI", layout="centered")

st.title("🛡️ IdeaGuard AI")
st.subheader("Agentic AI Product Idea Validator with Governance & Safety")

idea = st.text_area("Enter your AI product idea:")

if st.button("Evaluate Idea"):
    if idea.strip() == "":
        st.warning("Please enter an AI product idea.")
    else:
        with st.spinner("🔍 Analysing idea..."):
            analysis = analyzer_agent(idea)
            st.subheader("📌 Idea Analysis")
            st.write(analysis)

        with st.spinner("📊 Checking feasibility & market..."):
            feasibility = feasibility_agent(idea)
            st.subheader("📈 Feasibility & Market Score")
            st.write(feasibility)

        with st.spinner("🛡️ Checking governance & safety..."):
            governance = governance_agent(idea)
            st.subheader("⚠️ Governance & Safety Review")
            st.write(governance)

        with st.spinner("🚀 Improving idea..."):
            improvement = improver_agent(idea)
            st.subheader("💡 Improvement Suggestions")
            st.write(improvement)

        st.success("Evaluation completed!")
