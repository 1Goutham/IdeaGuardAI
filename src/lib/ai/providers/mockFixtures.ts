/**
 * Development fixtures for the mock engine and mock search.
 * All companies are fictional sample names (Northwind, Contoso, Fabrikam,
 * Tailspin) and every URL is on example.com, so none of this can be mistaken
 * for real research. Never used unless AI_PROVIDERS=mock / RESEARCH_PROVIDER=mock.
 */

export const MOCK_RESULTS = [
  {
    queries: ["demand", "students"],
    title: "Sample survey: how students search for internships",
    url: "https://example.com/sample/student-internship-survey",
    snippet:
      "Sample fixture. Respondents said they apply to many roles through generic job boards and rarely hear back. Most said they would welcome recommendations but want to understand why a role was suggested.",
    publishedAt: "2026-05-02",
  },
  {
    queries: ["demand", "trend"],
    title: "Sample article: early-career hiring shifts toward skills-based screening",
    url: "https://example.com/sample/skills-based-hiring",
    snippet: "Sample fixture. Employers increasingly screen interns on demonstrated skills rather than degree alone, and use automated tools to filter high application volumes.",
    publishedAt: "2026-03-18",
  },
  {
    queries: ["alternatives", "platforms", "competitors"],
    title: "Northwind Careers — internships for university students",
    url: "https://example.com/northwind-careers",
    snippet: "Sample fixture. Northwind Careers partners with universities to list internships. Free for students; employers pay per posting. Recommendations are based on major and graduation year.",
    publishedAt: null,
  },
  {
    queries: ["alternatives", "platforms", "competitors"],
    title: "Contoso Jobs review: good volume, poor matching",
    url: "https://example.com/reviews/contoso-jobs",
    snippet: "Sample fixture. Contoso Jobs has the largest volume of listings. Reviewers complain that suggested roles are generic and that applications disappear without a response. Premium plan $19/mo.",
    publishedAt: "2026-06-11",
  },
  {
    queries: ["alternatives", "platforms", "competitors"],
    title: "Fabrikam Intern uses AI to match students with startups",
    url: "https://example.com/news/fabrikam-intern-ai-matching",
    snippet: "Sample fixture. Fabrikam Intern launched AI matching between students and early-stage startups. Coverage is limited to technology roles in three cities.",
    publishedAt: "2026-07-24",
  },
  {
    queries: ["regulation", "ai", "automated"],
    title: "Sample guidance: automated decision-making in recruitment",
    url: "https://example.com/sample/automated-recruitment-guidance",
    snippet: "Sample fixture. Regulators treat AI used in recruitment as high-risk in some jurisdictions, requiring transparency, human oversight and bias monitoring.",
    publishedAt: "2026-02-09",
  },
];

const signalsFirst = [
  { key: "problemClarity", level: "medium", rationale: "Students struggling to find relevant internships is real, but the idea doesn't say whether the pain is discovery, eligibility or getting responses." },
  { key: "differentiation", level: "low", rationale: "Recommendation from a CV is a feature many job platforms already claim." },
  { key: "competition", level: "high", rationale: "Large job boards and university career platforms already serve this audience." },
  { key: "technicalComplexity", level: "medium", rationale: "CV parsing and matching are well understood; good ranking quality is the hard part." },
  { key: "dataDependency", level: "high", rationale: "Recommendations are only as good as the freshness and coverage of internship listings." },
  { key: "marketUncertainty", level: "medium", rationale: "Students want help, but willingness to pay is unproven; employers may be the payer." },
  { key: "mvpComplexity", level: "medium", rationale: "A useful MVP needs a listings source before matching can be tested." },
];

export const MOCK_OUTPUTS: Record<string, unknown> = {
  understand: {
    title: "Internship Matching",
    oneLiner: "An AI assistant that recommends internships to university students from their CV and interests, and helps them apply.",
    problem: "Students apply to large numbers of loosely relevant internships through generic job boards and hear back from few of them.",
    targetUser: "Undergraduate students in their penultimate year looking for a first internship.",
    solution: "Parses a student's CV and stated interests, ranks open internships by fit, explains each recommendation and helps tailor the application.",
    valueProposition: "Fewer, better-fitting applications with a reason for each, instead of mass-applying.",
    category: "Career services",
    productType: "B2C web app",
    differentiation: "Explained recommendations and application help in one place.",
    scope: "CV upload, interest profile, ranked recommendations, application assistance.",
    signals: signalsFirst,
    unclear: ["Where will internship listings come from?", "Who pays: students, universities or employers?", "Is this for one country or global?"],
    searchPlan: {
      market: ["internship search demand students survey", "early careers hiring trend skills-based"],
      competitors: ["internship platforms for students alternatives", "AI internship matching competitors"],
      context: ["AI automated decision-making recruitment regulation"],
    },
  },
  research: {
    summary: "Students want help narrowing their search but want recommendations explained. Employers are moving to skills-based screening, which favours matching on demonstrated skills. Automated recruitment tools face growing transparency requirements.",
    findings: [
      { topic: "demand", headline: "Students mass-apply and rarely hear back", detail: "Survey respondents describe applying widely through job boards with few responses, suggesting pain in relevance rather than discovery.", sourceIds: ["S1"], confidence: "medium" },
      { topic: "trend", headline: "Hiring is shifting to skills-based screening", detail: "Employers screen interns on demonstrated skills, which supports matching on skills rather than degree.", sourceIds: ["S2"], confidence: "medium" },
      { topic: "complaints", headline: "Existing recommendations feel generic", detail: "Reviews of large platforms complain that suggested roles are generic and applications go unanswered.", sourceIds: ["S5"], confidence: "medium" },
      { topic: "pricing", headline: "Student-paid plans exist but employers usually pay", detail: "One platform charges students for premium; another is free for students with employers paying per posting.", sourceIds: ["S3", "S5"], confidence: "low" },
      { topic: "regulation", headline: "AI in recruitment is treated as high-risk", detail: "Guidance requires transparency, human oversight and bias monitoring for automated recruitment decisions.", sourceIds: ["S4"], confidence: "medium" },
      { topic: "market", headline: "Trust in AI recommendations is untested for this audience", detail: "Students say they want to understand why a role is suggested; whether they would act on it is unknown.", sourceIds: ["S1", "S99"], confidence: "low" },
    ],
    openQuestions: ["Would students pay, or must employers or universities pay?", "Which listing sources can be accessed legally and reliably?"],
  },
  competitors: {
    competitors: [
      { name: "Northwind Careers", url: "https://example.com/northwind-careers", kind: "direct", description: "University-partnered internship listings platform.", audience: "University students", offering: "Listings with major-based recommendations", pricing: "Free for students; employers pay per posting", strengths: ["University partnerships", "Trusted by career services"], weaknesses: ["Coarse matching on major and year"], opportunity: "Match on skills and interests, not just major.", sourceIds: ["S3"] },
      { name: "Contoso Jobs", url: "", kind: "indirect", description: "General job board with the largest listing volume.", audience: "All job seekers", offering: "Job search and alerts", pricing: "Premium $19/mo", strengths: ["Listing volume", "Brand awareness"], weaknesses: ["Generic suggestions", "No feedback on applications"], opportunity: "Explain every recommendation and reduce wasted applications.", sourceIds: ["S5"] },
      { name: "Fabrikam Intern", url: "", kind: "direct", description: "AI matching between students and startups.", audience: "Students seeking startup internships", offering: "AI matching for tech roles", pricing: "", strengths: ["AI-first positioning"], weaknesses: ["Limited to tech roles in three cities"], opportunity: "Serve non-tech roles and more regions.", sourceIds: ["S6"] },
      { name: "Tailspin Mentors", url: "", kind: "substitute", description: "Peer mentoring for career decisions.", audience: "Students", offering: "Human advice", pricing: "", strengths: ["Human trust"], weaknesses: ["Doesn't scale"], opportunity: "Combine explainable AI with optional human review.", sourceIds: [] },
    ],
    whitespace: "No platform in the sources combines skills-based matching with an explanation for each recommendation across non-tech roles. Trust and explanation look like the open ground.",
    axes: { x: { label: "Matching depth", low: "Listings only", high: "Personalised" }, y: { label: "Guidance", low: "Self-serve", high: "Guided" } },
    placements: [
      { name: "Northwind Careers", x: "medium", y: "medium" },
      { name: "Contoso Jobs", x: "low", y: "low" },
      { name: "Fabrikam Intern", x: "high", y: "low" },
      { name: "Tailspin Mentors", x: "low", y: "high" },
      { name: "Your idea", x: "high", y: "high" },
    ],
  },
  feasibility: {
    summary: "Buildable by a small team using existing CV parsing and LLM ranking. The real constraint is access to fresh, complete internship listings.",
    effort: { level: "medium", rationale: "Core tech is off-the-shelf; data partnerships and ranking quality take the time." },
    components: [
      { name: "CV parsing", description: "Extracts skills, education and experience from uploaded CVs.", complexity: "low", approach: "integrate", note: "Mature parsers and LLM extraction exist." },
      { name: "Listings ingestion", description: "Collects and normalises internship listings.", complexity: "high", approach: "build", note: "Depends on partnerships or permitted feeds." },
      { name: "Matching and ranking", description: "Scores listings against a student profile.", complexity: "medium", approach: "build", note: "Embeddings plus rules; needs evaluation data." },
      { name: "Explanations", description: "Explains why each role was recommended.", complexity: "medium", approach: "build", note: "Must stay faithful to the actual ranking features." },
      { name: "Application assistant", description: "Helps tailor CV and cover letter.", complexity: "low", approach: "integrate", note: "LLM drafting with guardrails." },
    ],
    dataNeeds: [
      { need: "Current internship listings", availability: "hard", note: "Scraping is fragile and may breach terms; partnerships take time." },
      { need: "Student CVs and interests", availability: "available", note: "Provided by users with consent." },
      { need: "Outcome data (interviews, offers)", availability: "obtainable", note: "Self-reported by users over time." },
    ],
    hardestProblems: ["Reliable, legal access to listings", "Evaluating recommendation quality without outcome data", "Explanations that reflect the real ranking"],
    skills: ["Full-stack web", "Information retrieval", "LLM evaluation", "Partnerships"],
  },
  risks: {
    risks: [
      { title: "Listings supply dries up", category: "operational", severity: "high", likelihood: "medium", description: "Without partnerships, listings are incomplete or stale and recommendations lose value.", mitigation: "Start with one university and a curated set of employers.", sourceIds: [] },
      { title: "Students don't trust AI picks", category: "adoption", severity: "high", likelihood: "medium", description: "Students may prefer familiar platforms or human advice over AI suggestions.", mitigation: "Explain every recommendation and allow human review.", sourceIds: ["S1"] },
      { title: "Biased recommendations", category: "ethical", severity: "high", likelihood: "medium", description: "Ranking may reproduce bias against certain universities or backgrounds.", mitigation: "Audit rankings across groups; exclude protected attributes.", sourceIds: ["S4"] },
      { title: "Incumbents copy the feature", category: "market", severity: "medium", likelihood: "high", description: "Large platforms can add explained recommendations quickly.", mitigation: "Win a niche with depth incumbents won't serve.", sourceIds: ["S5"] },
      { title: "CV data breach", category: "privacy", severity: "high", likelihood: "low", description: "CVs contain personal data attractive to attackers.", mitigation: "Minimise retention, encrypt at rest, allow deletion.", sourceIds: [] },
    ],
    regulations: [
      { name: "GDPR", jurisdiction: "EU / UK", relevance: "Processing CVs is personal data processing and requires a lawful basis and deletion rights.", sourceIds: [] },
      { name: "EU AI Act", jurisdiction: "EU", relevance: "AI used for recruitment is classified as high-risk, requiring transparency and oversight.", sourceIds: ["S4"] },
    ],
  },
  critic: {
    assumptions: [
      { id: "A1", statement: "Students will trust AI to choose internships for them.", category: "desirability", importance: "high", evidence: "weak", whyItMayFail: "Users may prefer established platforms or human recommendations for a decision this important.", howToTest: "Interview 15 target students with sample recommendations and measure whether they would act on them." },
      { id: "A2", statement: "We can access enough current listings to make recommendations useful.", category: "feasibility", importance: "high", evidence: "none", whyItMayFail: "Listings are fragmented and protected by terms of service.", howToTest: "Secure listings from one career service and five employers before building matching." },
      { id: "A3", statement: "Better-fitting applications lead to more responses.", category: "viability", importance: "medium", evidence: "weak", whyItMayFail: "Response rates may depend on employer volume, not fit.", howToTest: "Concierge-match 10 students manually and compare response rates with their previous applications." },
      { id: "A4", statement: "Someone will pay for this.", category: "viability", importance: "high", evidence: "weak", whyItMayFail: "Students have little money; universities buy slowly.", howToTest: "Pitch a paid pilot to three university career services." },
    ],
    biggestAssumptionId: "A1",
    counterpoints: [
      { claim: "AI recommendations will save students time.", challenge: "Students may still apply broadly out of anxiety, so recommendations add a step rather than removing one." },
      { claim: "Explanations build trust.", challenge: "Explanations generated after the fact can sound plausible without reflecting the real ranking, which erodes trust when noticed." },
    ],
    experiments: [
      { id: "E1", assumptionId: "A1", title: "Trust interviews", method: "Show 15 students three AI recommendations with explanations, then ask which they would apply to and why.", expectedSignal: "Students choose recommended roles and cite the explanation.", successCriteria: "≥ 8 of 15 would apply to at least one recommended role.", effort: "low", timeframe: "1 week" },
      { id: "E2", assumptionId: "A2", title: "Listings supply test", method: "Ask one career service and five employers to share current internship listings for a pilot.", expectedSignal: "Partners agree and provide structured listings.", successCriteria: "≥ 100 current listings committed.", effort: "medium", timeframe: "3 weeks" },
      { id: "E3", assumptionId: "A3", title: "Concierge matching", method: "Manually match 10 students to roles for four weeks and track responses.", expectedSignal: "Higher response rate than their previous applications.", successCriteria: "Response rate at least double their baseline.", effort: "medium", timeframe: "4 weeks" },
      { id: "E4", assumptionId: "A4", title: "Paid pilot pitch", method: "Pitch a paid semester pilot to three university career services.", expectedSignal: "At least one asks for a proposal.", successCriteria: "1 signed letter of intent.", effort: "low", timeframe: "2 weeks" },
    ],
  },
  strategy: {
    stance: "refine",
    headline: "Promising if you narrow to one university and prove students act on explained recommendations before building matching at scale.",
    reasoning: "Demand for better-fitting internships is real, but the space is crowded and incumbents can copy explained recommendations. The idea's edge is trust, which is also its biggest untested assumption. Listing supply is the hidden constraint. A concierge pilot with one university tests both cheaply.",
    signals: [
      { ...signalsFirst[0], level: "high", rationale: "Research shows the pain is relevance and response rates, not discovery.", sourceIds: ["S1"] },
      { ...signalsFirst[1], level: "medium", rationale: "Explanation and trust are under-served in the sources.", sourceIds: ["S5", "S6"] },
      { ...signalsFirst[2], rationale: "Several platforms already serve students, including one with AI matching.", sourceIds: ["S3", "S5", "S6"] },
      { ...signalsFirst[3], sourceIds: [] },
      { ...signalsFirst[4], sourceIds: [] },
      { ...signalsFirst[5], sourceIds: ["S3", "S5"] },
      { ...signalsFirst[6], level: "low", rationale: "A concierge MVP needs no ingestion pipeline.", sourceIds: [] },
    ],
    positioning: {
      statement: "For penultimate-year students who apply widely and hear back rarely, this is a career assistant that recommends a few internships and explains why each fits. Unlike general job boards, every suggestion comes with a reason you can check.",
      wedge: "One university's business school, with its career service as the listings partner.",
    },
    mvp: {
      goal: "Prove students act on explained recommendations and get more responses.",
      buildFirst: [
        { title: "CV and interest intake", why: "Needed for any recommendation." },
        { title: "Curated listings from one partner", why: "Removes the supply problem for the pilot." },
        { title: "Explained top-5 recommendations", why: "Tests the core trust assumption." },
        { title: "Outcome tracking", why: "Measures whether responses improve." },
      ],
      dontBuildYet: [
        { title: "Automated listings scraping", why: "Legal risk and effort before value is proven." },
        { title: "Application auto-writing", why: "Distracts from the matching hypothesis." },
        { title: "Mobile app", why: "A web app is enough for a pilot." },
        { title: "Employer dashboard", why: "Only matters once students engage." },
      ],
      scope: "A web app for one university: students upload a CV, receive five explained recommendations from curated listings, and report outcomes.",
      successMetric: "Share of students who apply to at least one recommended role within a week.",
    },
    nextSteps: ["Run trust interviews with 15 students", "Approach one career service for a listings partnership", "Concierge-match 10 students manually", "Decide on the payer before writing code"],
    refinedIdea: "A career assistant for penultimate-year business students at one university that recommends five internships from the career service's listings and explains why each fits their CV. Students report outcomes so recommendations improve and the university can see results.",
  },
  prd: {
    title: "Explained Internship Matching — MVP PRD",
    summary: "A web app for one university that recommends five internships per student with an explanation for each, using curated listings from the career service.",
    problem: "Students apply widely to internships that fit poorly and hear back rarely. They want fewer, better-fitting options and to understand why a role suits them.",
    targetUsers: [
      { segment: "Penultimate-year business students", needs: ["Relevant roles", "Reasons to trust suggestions", "Less time applying"] },
      { segment: "University career advisers", needs: ["Visibility of student outcomes", "Less repetitive advising"] },
    ],
    journeys: [
      { name: "First recommendations", steps: ["Student signs in with university email", "Uploads CV", "Selects interests", "Receives five explained recommendations", "Saves or dismisses each"] },
      { name: "Report an outcome", steps: ["Receives weekly check-in", "Marks applied / interview / offer", "Sees updated recommendations"] },
    ],
    productRequirements: [
      { id: "PR1", requirement: "Students receive five relevant recommendations within two minutes of uploading a CV.", priority: "must" },
      { id: "PR2", requirement: "Every recommendation shows the reasons it was suggested.", priority: "must" },
      { id: "PR3", requirement: "Students can report application outcomes.", priority: "should" },
    ],
    functionalRequirements: [
      { id: "FR1", requirement: "Parse PDF and DOCX CVs into skills, education and experience.", priority: "must" },
      { id: "FR2", requirement: "Rank current listings against the student profile.", priority: "must" },
      { id: "FR3", requirement: "Generate explanations from the ranking features used.", priority: "must" },
      { id: "FR4", requirement: "Advisers can import listings via CSV.", priority: "must" },
      { id: "FR5", requirement: "Weekly outcome check-in email.", priority: "should" },
    ],
    nonFunctionalRequirements: [
      { category: "Privacy", requirement: "CVs deleted on request and after 12 months of inactivity." },
      { category: "Performance", requirement: "Recommendations return in under 10 seconds for 500 listings." },
      { category: "Accessibility", requirement: "WCAG 2.2 AA." },
    ],
    aiRequirements: [
      { capability: "Ranking", requirement: "Top-5 includes at least one role an adviser rates relevant for 90% of students.", evaluation: "Adviser-labelled sample of 50 profiles." },
      { capability: "Explanations", requirement: "Explanations reference only features present in the CV and listing.", evaluation: "Manual faithfulness review of 100 explanations." },
    ],
    dataRequirements: [
      { entity: "Student profile", source: "CV upload and form", handling: "Encrypted at rest; deletable by the student." },
      { entity: "Listings", source: "Career service CSV", handling: "Expire after closing date." },
    ],
    successMetrics: [
      { metric: "Recommendation action rate", target: "≥ 40% apply to one recommendation within 7 days", why: "Tests trust in recommendations." },
      { metric: "Response rate", target: "2× the student's baseline", why: "Tests the value of better fit." },
    ],
    mvpScope: { inScope: ["CV intake", "Curated listings import", "Explained top-5", "Outcome tracking"], outOfScope: ["Scraping", "Auto-written applications", "Mobile app", "Employer dashboard"] },
    openQuestions: ["Who pays after the pilot?", "What counts as a relevant recommendation for advisers?"],
  },
  blueprint: {
    summary: "A Next.js web app with a small API layer, a ranking service that combines embeddings with rules, and Postgres with pgvector. LLMs are used for CV extraction and explanation, never for the ranking decision itself.",
    layers: [
      { id: "client", name: "Frontend", items: [{ name: "Next.js app", role: "Student and adviser interfaces" }] },
      { id: "api", name: "API", items: [{ name: "Route handlers", role: "Auth, uploads, recommendations" }, { name: "Job queue", role: "CV parsing and re-ranking" }] },
      { id: "ai", name: "AI layer", items: [{ name: "CV extractor", role: "LLM structured extraction" }, { name: "Ranker", role: "Embeddings + rules" }, { name: "Explainer", role: "Explanation from ranking features" }] },
      { id: "data", name: "Data", items: [{ name: "Postgres + pgvector", role: "Profiles, listings, embeddings" }, { name: "Object storage", role: "Encrypted CV files" }] },
      { id: "external", name: "External", items: [{ name: "University SSO", role: "Sign-in" }, { name: "Email service", role: "Check-ins" }] },
    ],
    stack: [
      { area: "Frontend", choice: "Next.js + TypeScript", why: "One codebase for UI and API." },
      { area: "Database", choice: "Postgres with pgvector", why: "Relational data and vector search in one store." },
      { area: "LLM", choice: "Hosted LLM with JSON output", why: "Reliable CV extraction and explanations." },
    ],
    apis: [
      { method: "POST", path: "/api/profile/cv", purpose: "Upload and parse a CV" },
      { method: "GET", path: "/api/recommendations", purpose: "Top-5 explained recommendations" },
      { method: "POST", path: "/api/outcomes", purpose: "Report an application outcome" },
      { method: "POST", path: "/api/listings/import", purpose: "Adviser CSV import" },
    ],
    dataModel: [
      { entity: "Student", fields: ["id", "universityId", "skills", "interests", "embedding"] },
      { entity: "Listing", fields: ["id", "employer", "title", "requirements", "closesAt", "embedding"] },
      { entity: "Recommendation", fields: ["id", "studentId", "listingId", "score", "reasons"] },
      { entity: "Outcome", fields: ["id", "recommendationId", "status", "reportedAt"] },
    ],
    dataFlow: ["Student uploads CV", "Queue parses CV into a structured profile", "Profile is embedded", "Ranker scores open listings", "Explainer writes reasons from the top features", "Student sees five recommendations"],
    aiComponents: [
      { name: "CV extractor", approach: "LLM structured extraction", input: "CV text", output: "Skills, education, experience", guardrails: "Schema validation; low-confidence fields flagged" },
      { name: "Explainer", approach: "LLM constrained to ranking features", input: "Top features for a match", output: "2–3 reasons", guardrails: "Rejects reasons not in the feature list" },
    ],
    risks: [
      { risk: "Explanations drift from the real ranking", mitigation: "Generate only from logged features; audit samples." },
      { risk: "Cold start without outcome data", mitigation: "Start with adviser-labelled relevance." },
    ],
  },
};
