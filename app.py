import streamlit as st
from agents.analyzer import analyzer_agent
from agents.feasibility import feasibility_agent
from agents.governance import governance_agent
from agents.improver import improver_agent

st.set_page_config(page_title="IdeaGuard AI", layout="wide")

# ---- Custom CSS ----
st.markdown("""
<style>
body {
    background: linear-gradient(135deg, #c850c0, #4158d0);
}
.main {
    background: linear-gradient(135deg, #c850c0, #4158d0);
}
.card {
    background: rgba(255,255,255,0.15);
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 20px;
}
.title {
    font-size: 36px;
    font-weight: bold;
    color: white;
}
.subtitle {
    font-size: 18px;
    color: white;
}
.text {
    color: white;
}
</style>
""", unsafe_allow_html=True)

# ---- Header ----
st.markdown('<div class="title">🛡️ IdeaGuard AI</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">Agentic AI Product Idea Validator with Governance & Safety</div>', unsafe_allow_html=True)

st.markdown("### Question:")
st.markdown("**Description short –** Share your AI product idea and get structured evaluation.")

idea = st.text_area("Enter your AI product idea:")

if st.button("Evaluate Idea"):
    if idea.strip() == "":
        st.warning("Please enter an AI product idea.")
    else:
        col1, col2 = st.columns(2)

        with st.spinner("🔍 Analysing idea..."):
            analysis = analyzer_agent(idea)

        with col1:
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.markdown("### 📌 Idea Analysis")
            st.write(analysis)
            st.markdown('</div>', unsafe_allow_html=True)

        with st.spinner("📊 Feasibility & Market..."):
            feasibility = feasibility_agent(idea)

        with col2:
            st.markdown('<div class="card">', unsafe_allow_html=True)
            st.markdown("### 📈 Feasibility & Market Score")
            st.write(feasibility)
            st.markdown('</div>', unsafe_allow_html=True)

        with st.spinner("🛡️ Governance & Safety..."):
            governance = governance_agent(idea)

        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.markdown("### ⚠️ Governance & Safety Review")
        st.write(governance)
        st.markdown('</div>', unsafe_allow_html=True)

        with st.spinner("🚀 Improvement suggestions..."):
            improvement = improver_agent(idea)

        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.markdown("### 💡 Improvement Suggestions")
        st.write(improvement)
        st.markdown('</div>', unsafe_allow_html=True)

        st.success("Evaluation completed!")
