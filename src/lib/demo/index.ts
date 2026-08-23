import { NextResponse } from "next/server";

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// ─── Demo user ────────────────────────────────────────────────────────────────
export const DEMO_USER = {
  id: "demo-user-00000000-0000-0000-0000-000000000000",
  email: "sara@tweenz.ae",
  aud: "authenticated",
  role: "authenticated",
  user_metadata: { full_name: "Sara Al-Mansouri" },
  app_metadata: {},
  created_at: "2025-09-01T00:00:00.000Z",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Anchored to today, not to a fixed date. A demo pinned to a past day shows
// every deadline as months overdue, which reads as a broken product rather
// than a sample. Anchoring to now keeps the sample honest whenever it is
// opened: the same relative story, always current.
const BASE = (() => {
  const base = new Date();
  base.setUTCHours(9, 0, 0, 0);
  return base;
})();
const d = (days: number, time = "T09:00:00.000Z") =>
  new Date(BASE.getTime() + days * 86_400_000).toISOString().replace(/T09:00:00\.000Z$/, time);

// ─── Mock data ────────────────────────────────────────────────────────────────

export const DEMO_PROFILE = {
  id: DEMO_USER.id,
  full_name: "Sara Al-Mansouri",
  avatar_url: null,
  email: "sara@tweenz.ae",
};

export const DEMO_SUBSCRIPTION = {
  id: "sub-demo-001",
  user_id: DEMO_USER.id,
  plan: "free",
  status: "active",
  ai_queries_used: 47,
  ai_queries_limit: 99999,
  current_period_end: null,
  trial_ends_at: null,
  cancel_at_period_end: false,
  stripe_customer_id: null,
  stripe_sub_id: null,
  all_features_free: true,
};

export const DEMO_COURSES = [
  { id: "course-001", user_id: DEMO_USER.id, name: "Strategic Management", code: "MGMT 601", instructor: "Dr. Khalid Al-Rashidi", progress: 78, status: "active", starred: true, color: "#6366f1", credits: 3, created_at: d(-60) },
  { id: "course-002", user_id: DEMO_USER.id, name: "Financial Analysis", code: "FIN 502", instructor: "Prof. Layla Hassan", progress: 65, status: "active", starred: false, color: "#0ea5e9", credits: 3, created_at: d(-58) },
  { id: "course-003", user_id: DEMO_USER.id, name: "Operations & Supply Chain", code: "OPS 503", instructor: "Dr. Ahmed Nasser", progress: 82, status: "active", starred: false, color: "#10b981", credits: 3, created_at: d(-55) },
  { id: "course-004", user_id: DEMO_USER.id, name: "Digital Marketing", code: "MKT 604", instructor: "Dr. Rania Mostafa", progress: 90, status: "active", starred: true, color: "#f59e0b", credits: 3, created_at: d(-50) },
  { id: "course-005", user_id: DEMO_USER.id, name: "Leadership & Org Behavior", code: "HRM 501", instructor: "Prof. Omar Shaikh", progress: 55, status: "active", starred: false, color: "#ec4899", credits: 3, created_at: d(-45) },
];

export const DEMO_DEADLINES = [
  { id: "dl-001", user_id: DEMO_USER.id, title: "SWOT Analysis Report", type: "assignment", course_id: "course-001", course_name: "Strategic Management", due_date: d(-3, "T23:59:00.000Z"), risk: "overdue", is_done: false, priority: "high", notes: "Must include competitive analysis for UAE market", created_at: d(-20) },
  { id: "dl-002", user_id: DEMO_USER.id, title: "Porter's Five Forces Case Study", type: "case_study", course_id: "course-001", course_name: "Strategic Management", due_date: d(2, "T23:59:00.000Z"), risk: "at_risk", is_done: false, priority: "high", notes: "Tesla Motors in the GCC region", created_at: d(-15) },
  { id: "dl-003", user_id: DEMO_USER.id, title: "Marketing Campaign Proposal", type: "project", course_id: "course-004", course_name: "Digital Marketing", due_date: d(3, "T23:59:00.000Z"), risk: "at_risk", is_done: false, priority: "high", notes: "Social media strategy for Noon.com", created_at: d(-10) },
  { id: "dl-004", user_id: DEMO_USER.id, title: "Financial Modeling Assignment", type: "assignment", course_id: "course-002", course_name: "Financial Analysis", due_date: d(5, "T23:59:00.000Z"), risk: "due_soon", is_done: false, priority: "medium", notes: "DCF valuation model for a UAE retail company", created_at: d(-12) },
  { id: "dl-005", user_id: DEMO_USER.id, title: "HRM Leadership Essay", type: "essay", course_id: "course-005", course_name: "Leadership & Org Behavior", due_date: d(7, "T23:59:00.000Z"), risk: "due_soon", is_done: false, priority: "medium", notes: "Transformational vs. Transactional leadership (1500 words)", created_at: d(-8) },
  { id: "dl-006", user_id: DEMO_USER.id, title: "Group Project Presentation", type: "presentation", course_id: "course-003", course_name: "Operations & Supply Chain", due_date: d(10, "T14:00:00.000Z"), risk: "safe", is_done: false, priority: "medium", notes: "Supply chain disruption analysis · 15-min slot", created_at: d(-5) },
  { id: "dl-007", user_id: DEMO_USER.id, title: "Mid-term Exam: Financial Analysis", type: "exam", course_id: "course-002", course_name: "Financial Analysis", due_date: d(14, "T10:00:00.000Z"), risk: "safe", is_done: false, priority: "high", notes: "Chapters 1·6, open book, 2 hours", created_at: d(-3) },
  { id: "dl-008", user_id: DEMO_USER.id, title: "Operations Research Paper", type: "paper", course_id: "course-003", course_name: "Operations & Supply Chain", due_date: d(19, "T23:59:00.000Z"), risk: "safe", is_done: false, priority: "low", notes: "10 pages minimum, APA format", created_at: d(-2) },
];

export const DEMO_ANNOUNCEMENTS = [
  {
    id: "ann-001", user_id: DEMO_USER.id, course_id: "course-001", course_name: "Strategic Management",
    title: "Guest Speaker Session Rescheduled",
    body: "The session with McKinsey partner Abdullah Al-Harbi has been rescheduled from May 8 to May 15. Location: Room B-204. Attendance is mandatory and counts toward your participation grade.",
    source: "email", summary: "McKinsey guest lecture moved from May 8 to May 15 in Room B-204. Mandatory attendance.", required_action: "Update your calendar and confirm attendance via the portal by May 10.", risk_level: "medium", is_archived: false, created_at: d(-1),
  },
  {
    id: "ann-002", user_id: DEMO_USER.id, course_id: "course-002", course_name: "Financial Analysis",
    title: "Mid-term Exam Format Change",
    body: "Based on feedback, the mid-term will now include 2 case study questions instead of 5 short-answer questions. The total marks remain at 100. The exam will focus on DCF, ratio analysis, and capital structure. Past exams are on Moodle.",
    source: "email", summary: "Exam format updated: 2 case studies (not 5 short answers). Focus: DCF, ratios, capital structure.", required_action: "Review DCF models and ratio analysis from Weeks 1·5. Practice with past exam papers.", risk_level: "high", is_archived: false, created_at: d(-2),
  },
  {
    id: "ann-003", user_id: DEMO_USER.id, course_id: "course-003", course_name: "Operations & Supply Chain",
    title: "Group Project Deadline Extended",
    body: "Due to the Emirates National Day holiday, the group project submission deadline has been moved to May 16. The presentation schedule remains unchanged. Please submit your slide deck to the course portal 48 hours before your presentation slot.",
    source: "portal", summary: "Group project submission deadline extended to May 16. Presentations unchanged.", required_action: "Submit slide deck 48 hours before your presentation slot on May 10.", risk_level: "low", is_archived: false, created_at: d(-3),
  },
  {
    id: "ann-004", user_id: DEMO_USER.id, course_id: "course-004", course_name: "Digital Marketing",
    title: "Campaign Proposal Grading Rubric Updated",
    body: "Please review the updated grading rubric on Moodle. Key change: creativity and innovation now carries 25% weight (was 15%). Strategic alignment remains the highest weighted criterion at 35%.",
    source: "moodle", summary: "Rubric updated: creativity now 25%, strategic alignment 35%.", required_action: "Ensure your proposal demonstrates clear creative differentiation and strong strategic fit.", risk_level: "medium", is_archived: false, created_at: d(-4),
  },
];

export const DEMO_TASKS = [
  { id: "task-001", user_id: DEMO_USER.id, title: "Review Porter's 5 Forces lecture notes", status: "todo", priority: "high", course_id: "course-001", course_name: "Strategic Management", due_date: d(1), created_at: d(-2) },
  { id: "task-002", user_id: DEMO_USER.id, title: "Read Chapter 8 · Financial Statement Analysis", status: "todo", priority: "high", course_id: "course-002", course_name: "Financial Analysis", due_date: d(3), created_at: d(-2) },
  { id: "task-003", user_id: DEMO_USER.id, title: "Schedule group meeting for Operations project", status: "todo", priority: "medium", course_id: "course-003", course_name: "Operations & Supply Chain", due_date: d(2), created_at: d(-1) },
  { id: "task-004", user_id: DEMO_USER.id, title: "Prepare Case Study slides (Tesla / GCC)", status: "in_progress", priority: "high", course_id: "course-001", course_name: "Strategic Management", due_date: d(2), created_at: d(-3) },
  { id: "task-005", user_id: DEMO_USER.id, title: "Draft marketing campaign creative brief", status: "in_progress", priority: "high", course_id: "course-004", course_name: "Digital Marketing", due_date: d(3), created_at: d(-2) },
  { id: "task-006", user_id: DEMO_USER.id, title: "Outline DCF model structure", status: "in_progress", priority: "medium", course_id: "course-002", course_name: "Financial Analysis", due_date: d(5), created_at: d(-1) },
  { id: "task-007", user_id: DEMO_USER.id, title: "Submit MGMT 601 reading summary", status: "completed", priority: "low", course_id: "course-001", course_name: "Strategic Management", due_date: d(-7), created_at: d(-10) },
  { id: "task-008", user_id: DEMO_USER.id, title: "Read HRM Chapter 3 · Motivation Theories", status: "completed", priority: "low", course_id: "course-005", course_name: "Leadership & Org Behavior", due_date: d(-5), created_at: d(-8) },
  { id: "task-009", user_id: DEMO_USER.id, title: "Complete Operations Lab Report", status: "completed", priority: "medium", course_id: "course-003", course_name: "Operations & Supply Chain", due_date: d(-4), created_at: d(-9) },
];

export const DEMO_GRADES = [
  { id: "gr-001", user_id: DEMO_USER.id, course_id: "course-001", course_name: "Strategic Management", category: "Assignment", item_name: "Industry Analysis Report", score: 82, max_score: 100, weight: 15, created_at: d(-30) },
  { id: "gr-002", user_id: DEMO_USER.id, course_id: "course-001", course_name: "Strategic Management", category: "Participation", item_name: "Week 1·4 Class Participation", score: 18, max_score: 20, weight: 10, created_at: d(-20) },
  { id: "gr-003", user_id: DEMO_USER.id, course_id: "course-002", course_name: "Financial Analysis", category: "Quiz", item_name: "Financial Ratios Quiz", score: 74, max_score: 100, weight: 10, created_at: d(-25) },
  { id: "gr-004", user_id: DEMO_USER.id, course_id: "course-003", course_name: "Operations & Supply Chain", category: "Lab Report", item_name: "Lean Manufacturing Case", score: 91, max_score: 100, weight: 20, created_at: d(-18) },
  { id: "gr-005", user_id: DEMO_USER.id, course_id: "course-004", course_name: "Digital Marketing", category: "Project", item_name: "Campaign Concept Pitch", score: 88, max_score: 100, weight: 25, created_at: d(-15) },
  { id: "gr-006", user_id: DEMO_USER.id, course_id: "course-005", course_name: "Leadership & Org Behavior", category: "Participation", item_name: "Case Discussion Week 3", score: 76, max_score: 100, weight: 10, created_at: d(-22) },
  { id: "gr-007", user_id: DEMO_USER.id, course_id: "course-002", course_name: "Financial Analysis", category: "Assignment", item_name: "Working Capital Analysis", score: 79, max_score: 100, weight: 15, created_at: d(-10) },
];

export const DEMO_FILES = [
  { id: "file-001", user_id: DEMO_USER.id, course_id: "course-001", course_name: "Strategic Management", file_name: "StrategicMgmt_Week5_Porter.pdf", file_type: "application/pdf", file_size: 2_450_000, storage_path: "demo/file-001.pdf", processing_status: "ready", chunk_count: 18, created_at: d(-14) },
  { id: "file-002", user_id: DEMO_USER.id, course_id: "course-002", course_name: "Financial Analysis", file_name: "FinancialAnalysis_Week3_DCF.pdf", file_type: "application/pdf", file_size: 3_200_000, storage_path: "demo/file-002.pdf", processing_status: "ready", chunk_count: 24, created_at: d(-12) },
  { id: "file-003", user_id: DEMO_USER.id, course_id: "course-003", course_name: "Operations & Supply Chain", file_name: "Operations_CaseStudy_SupplyChain.pdf", file_type: "application/pdf", file_size: 1_800_000, storage_path: "demo/file-003.pdf", processing_status: "processing", chunk_count: 0, created_at: d(-1) },
  { id: "file-004", user_id: DEMO_USER.id, course_id: "course-004", course_name: "Digital Marketing", file_name: "DigitalMarketing_Readings_Week4.pdf", file_type: "application/pdf", file_size: 4_100_000, storage_path: "demo/file-004.pdf", processing_status: "ready", chunk_count: 31, created_at: d(-9) },
];

export const DEMO_STUDY_PACKS = [
  {
    id: "pack-001", user_id: DEMO_USER.id, file_id: "file-001", course_id: "course-001", course_name: "Strategic Management",
    title: "Porter's Five Forces · Complete Guide", topic: "Porter's Five Forces", status: "ready",
    overview: "Porter's Five Forces is a strategic analysis framework developed by Michael Porter (Harvard, 1979) that evaluates competitive intensity and market attractiveness across five dimensions: competitive rivalry, threat of new entrants, bargaining power of buyers, bargaining power of suppliers, and threat of substitutes.",
    summary: "This pack covers the complete Porter's Five Forces framework applied to real-world MBA case studies. You'll understand how to evaluate industry attractiveness, identify strategic positioning, and apply the model to UAE and GCC market contexts. The framework remains the gold standard for external environmental analysis in MBA programs worldwide.",
    detailed_notes: "## Porter's Five Forces Framework\n\n### 1. Competitive Rivalry\n- Number of competitors, their size, and diversity\n- Industry growth rate · slow growth = higher rivalry\n- Fixed costs · high fixed costs pressure firms to compete on price\n- **UAE Context**: Telecoms (Etisalat vs. du) shows duopoly rivalry\n\n### 2. Threat of New Entrants\n- Barriers to entry: capital requirements, economies of scale, brand loyalty, regulatory\n- **Key insight**: High barriers = low threat = more attractive industry\n- Saudi Vision 2030 is reducing barriers in many sectors\n\n### 3. Bargaining Power of Buyers\n- Buyer concentration, price sensitivity, switching costs\n- When buyers are powerful, they squeeze margins\n- **Example**: Large UAE government procurement contracts\n\n### 4. Bargaining Power of Suppliers\n- Supplier concentration, uniqueness of input, switching cost\n- OPEC as the ultimate supplier power example\n\n### 5. Threat of Substitutes\n- Price-performance ratio of substitutes\n- **Digital disruption** = biggest source of substitution today\n\n## Applying the Framework\n1. Identify all relevant factors for each force\n2. Rate each force: Low / Medium / High\n3. Aggregate to determine overall industry attractiveness\n4. Link analysis to strategic recommendations",
    key_takeaways: ["Porter's Five Forces provides a systematic way to assess industry attractiveness and competitive dynamics", "The most attractive industries have low rivalry, high entry barriers, weak buyers and suppliers, and few substitutes", "In the GCC context, government regulation and Vision programs significantly alter traditional force assessments", "Always pair Five Forces with internal analysis (VRIO/SWOT) for a complete strategic picture", "The framework is static · use Dynamic Capabilities theory to account for rapid change"],
    glossary: [
      { term: "Competitive Rivalry", definition: "The intensity of competition between existing players in an industry" },
      { term: "Entry Barriers", definition: "Obstacles that prevent new competitors from easily entering a market" },
      { term: "Switching Costs", definition: "Costs a buyer incurs when changing from one supplier/product to another" },
      { term: "Value Chain", definition: "The sequence of activities a firm performs to deliver a product, analyzed alongside Five Forces" },
      { term: "Industry Attractiveness", definition: "The profit potential of an industry based on its competitive structure" },
    ],
    mba_frameworks: [
      { name: "SWOT Analysis", application: "Use alongside Five Forces · Five Forces covers external threats/opportunities, SWOT adds internal strengths/weaknesses" },
      { name: "PESTLE Analysis", application: "Provides macro-environmental context that shapes the intensity of each force (e.g., political barriers to entry)" },
      { name: "Value Chain Analysis", application: "Identifies where supplier/buyer power is concentrated along the production process" },
    ],
    exam_prep_notes: "Focus on: (1) Applying all 5 forces to a given case with evidence, not just listing them. (2) UAE/GCC-specific examples · professor emphasizes regional context. (3) Be able to argue which force is most important in a specific industry. Likely exam question: 'Apply Porter's Five Forces to the UAE aviation industry and recommend a strategic response.'",
    created_at: d(-13),
  },
  {
    id: "pack-002", user_id: DEMO_USER.id, file_id: "file-002", course_id: "course-002", course_name: "Financial Analysis",
    title: "DCF Valuation · Master Reference", topic: "Discounted Cash Flow (DCF) Valuation", status: "ready",
    overview: "Discounted Cash Flow (DCF) analysis is the foundational valuation method in corporate finance, calculating the present value of expected future free cash flows by discounting them at the Weighted Average Cost of Capital (WACC).",
    summary: "DCF valuation translates a company's future earning potential into a present-day value. It is the primary tool used in investment banking, M&A, and corporate strategy. This pack covers free cash flow projection, WACC calculation, terminal value estimation, and sensitivity analysis · all critical for the mid-term exam and your future career.",
    detailed_notes: "## DCF Valuation Step-by-Step\n\n### Step 1: Project Free Cash Flows (FCF)\n- FCF = EBIT(1-t) + D&A − ΔWorking Capital − CapEx\n- Typically project 5·10 years explicitly\n- Use revenue growth rates, margin assumptions\n\n### Step 2: Calculate WACC\n- WACC = (E/V × Re) + (D/V × Rd × (1-t))\n- Re = Cost of equity (CAPM: Rf + β × ERP)\n- Rd = Pre-tax cost of debt × (1 - tax rate)\n- UAE context: Rf ≈ 4.5% (US 10yr), ERP ≈ 6.5%\n\n### Step 3: Terminal Value\n- Gordon Growth Model: TV = FCF_n+1 / (WACC − g)\n- Exit Multiple Method: TV = EBITDA × EV/EBITDA multiple\n- Terminal value often = 60·80% of total DCF value!\n\n### Step 4: Discount Back & Calculate Equity Value\n- PV of FCFs + PV of Terminal Value = Enterprise Value\n- EV − Net Debt = Equity Value\n- Equity Value / Shares Outstanding = Intrinsic Share Price\n\n### Step 5: Sensitivity Analysis\n- Key variables: WACC ± 1%, g ± 0.5%\n- Build a 2-variable sensitivity table in Excel",
    key_takeaways: ["Terminal value dominates DCF · small changes in WACC or growth rate create large valuation swings", "FCF = EBIT(1-t) + D&A − CapEx − ΔNWC · memorize this formula", "WACC combines the cost of all capital sources weighted by their proportion in the capital structure", "Always run sensitivity analysis · a single-point DCF is misleading", "Cross-check DCF with comparable company analysis (EV/EBITDA multiples)"],
    glossary: [
      { term: "Free Cash Flow (FCF)", definition: "Cash generated by a business after accounting for capital expenditures · available to all capital providers" },
      { term: "WACC", definition: "Weighted Average Cost of Capital · the blended rate of return required by equity and debt holders" },
      { term: "Terminal Value", definition: "The value of all future cash flows beyond the explicit forecast period, often 60-80% of total DCF" },
      { term: "EBITDA", definition: "Earnings Before Interest, Taxes, Depreciation & Amortization · a proxy for operating cash flow" },
      { term: "Beta (β)", definition: "A measure of a stock's volatility relative to the market · used in CAPM to estimate cost of equity" },
    ],
    mba_frameworks: [
      { name: "CAPM", application: "Used to estimate the cost of equity component of WACC" },
      { name: "M&M Theorem", application: "Foundational theory explaining the relationship between capital structure and firm value in frictionless markets" },
    ],
    exam_prep_notes: "Mid-term will include a full DCF question. Practice: build a 3-statement model from scratch, compute WACC with given beta and market data, calculate terminal value both ways and explain the difference. Know the formula: FCF = EBIT(1-t) + D&A − CapEx − ΔNWC by heart.",
    created_at: d(-11),
  },
  {
    id: "pack-003", user_id: DEMO_USER.id, file_id: "file-004", course_id: "course-004", course_name: "Digital Marketing",
    title: "Digital Marketing Strategy Framework", topic: "Digital Marketing & Campaign Strategy", status: "ready",
    overview: "Modern digital marketing integrates paid, owned, and earned media across search, social, email, and content channels to reach target audiences with measurable precision, guided by data analytics and customer journey mapping.",
    summary: "This pack covers the full digital marketing strategy lifecycle: audience segmentation, channel selection, content strategy, campaign execution, and ROI measurement. Special focus on social media marketing (Instagram, TikTok, LinkedIn) and performance marketing channels relevant to the UAE/GCC market.",
    detailed_notes: "## Digital Marketing Strategy\n\n### The RACE Framework\n- **Reach**: Build awareness (SEO, paid ads, social)\n- **Act**: Drive interaction (content, landing pages)\n- **Convert**: Turn leads to customers (email, retargeting)\n- **Engage**: Build loyalty (CRM, community)\n\n### UAE Digital Landscape\n- 99% internet penetration\n- Highest Instagram and Twitter usage per capita globally\n- WhatsApp Business critical for B2C\n- TikTok fastest growing in 18·35 demographic\n\n### Campaign Planning\n1. Define SMART objectives\n2. Audience segmentation (demographic, psychographic, behavioral)\n3. Channel mix strategy\n4. Content calendar\n5. KPI dashboard setup\n6. A/B testing plan",
    key_takeaways: ["UAE has one of the world's highest social media penetration rates · digital-first is mandatory", "RACE framework provides a customer journey structure for campaign planning", "Data-driven decisions: set KPIs before launching any campaign", "Influencer marketing is particularly powerful in UAE · 40% of consumers trust influencer recommendations"],
    glossary: [
      { term: "CTR", definition: "Click-Through Rate · percentage of impressions that result in a click" },
      { term: "ROAS", definition: "Return on Ad Spend · revenue generated per dirham spent on advertising" },
      { term: "Conversion Rate", definition: "Percentage of visitors/leads that complete a desired action" },
      { term: "CAC", definition: "Customer Acquisition Cost · total marketing spend divided by new customers acquired" },
    ],
    mba_frameworks: [
      { name: "STP (Segmentation, Targeting, Positioning)", application: "Foundation of digital campaign strategy · define who you're targeting before choosing channels" },
      { name: "4Ps of Marketing", application: "Evolved to 7Ps for digital · add People, Process, Physical Evidence" },
    ],
    exam_prep_notes: "Proposal grading heavily weights strategic alignment (35%) and creativity (25%). Your proposal must: (1) clearly define the target segment, (2) justify channel selection with data, (3) include realistic KPIs, (4) show creative differentiation.",
    created_at: d(-8),
  },
];

export const DEMO_FLASHCARDS = [
  { id: "fc-001", user_id: DEMO_USER.id, study_pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management", front: "What are Porter's Five Forces?", back: "1. Competitive Rivalry 2. Threat of New Entrants 3. Bargaining Power of Buyers 4. Bargaining Power of Suppliers 5. Threat of Substitutes. Together they determine industry attractiveness and profit potential.", created_at: d(-13) },
  { id: "fc-002", user_id: DEMO_USER.id, study_pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management", front: "What factors increase the Threat of New Entrants?", back: "Low barriers to entry: weak brand loyalty, low capital requirements, no economies of scale, easy access to distribution channels, minimal regulatory hurdles, low switching costs.", created_at: d(-13) },
  { id: "fc-003", user_id: DEMO_USER.id, study_pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management", front: "When is Buyer Power HIGH?", back: "When buyers are few and large, products are standardized/commodity, switching costs are low, buyers can integrate backward, price sensitivity is high, or buyers have full market information.", created_at: d(-13) },
  { id: "fc-004", user_id: DEMO_USER.id, study_pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management", front: "What makes an industry highly attractive according to Five Forces?", back: "Low competitive rivalry, high barriers to entry, weak buyer power, weak supplier power, few or no substitutes. All five forces are 'weak' from a competitive threat perspective.", created_at: d(-13) },
  { id: "fc-005", user_id: DEMO_USER.id, study_pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management", front: "Name a UAE industry example for high competitive rivalry.", back: "UAE Telecoms (Etisalat/e& vs. du) · duopoly with fierce competition on price, data bundles, and customer service. Both compete aggressively for market share in a mature market.", created_at: d(-13) },
  { id: "fc-006", user_id: DEMO_USER.id, study_pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis", front: "What is the formula for Free Cash Flow (FCF)?", back: "FCF = EBIT × (1 − Tax Rate) + Depreciation & Amortization − Capital Expenditures − Change in Net Working Capital\n\nOr simply: Net Operating Profit After Tax + Non-cash charges − Reinvestment", created_at: d(-11) },
  { id: "fc-007", user_id: DEMO_USER.id, study_pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis", front: "What is WACC and its formula?", back: "WACC = (E/V × Re) + (D/V × Rd × (1−t))\nWhere: E = equity value, D = debt value, V = E+D, Re = cost of equity, Rd = cost of debt, t = tax rate.\nIt represents the minimum required return on invested capital.", created_at: d(-11) },
  { id: "fc-008", user_id: DEMO_USER.id, study_pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis", front: "How do you calculate Terminal Value using the Gordon Growth Model?", back: "TV = FCF(n+1) / (WACC − g)\nWhere: FCF(n+1) = next year's free cash flow after the forecast period, g = perpetual growth rate (typically 2-3% for mature companies). Terminal value often represents 60-80% of total enterprise value.", created_at: d(-11) },
  { id: "fc-009", user_id: DEMO_USER.id, study_pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis", front: "What is CAPM and when is it used in DCF?", back: "CAPM: Re = Rf + β × (Rm − Rf)\nRf = risk-free rate, β = beta (systematic risk), Rm−Rf = equity risk premium.\nUsed to estimate the cost of equity in the WACC calculation. In the UAE, Rf ≈ 4.5% (US 10yr Treasury), ERP ≈ 6.5%.", created_at: d(-11) },
  { id: "fc-010", user_id: DEMO_USER.id, study_pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis", front: "Why is sensitivity analysis critical in DCF valuation?", back: "DCF outputs are highly sensitive to WACC and terminal growth rate assumptions. A 1% change in WACC or g can change the implied share price by 20-40%. Sensitivity analysis shows the range of possible outcomes and helps identify key value drivers.", created_at: d(-11) },
  { id: "fc-011", user_id: DEMO_USER.id, study_pack_id: "pack-003", pack_topic: "Digital Marketing Strategy", course_name: "Digital Marketing", front: "What is the RACE Digital Marketing Framework?", back: "RACE = Reach → Act → Convert → Engage\nReach: Build brand awareness. Act: Drive website/app interaction. Convert: Turn visitors into customers. Engage: Build repeat purchase and loyalty. Maps the full customer lifecycle.", created_at: d(-8) },
  { id: "fc-012", user_id: DEMO_USER.id, study_pack_id: "pack-003", pack_topic: "Digital Marketing Strategy", course_name: "Digital Marketing", front: "What does ROAS stand for and how is it calculated?", back: "ROAS = Return On Ad Spend = Revenue Generated / Ad Spend × 100%\nExample: If you spend AED 10,000 on ads and generate AED 50,000 in revenue, ROAS = 500%. A ROAS above 400% is typically considered healthy in e-commerce.", created_at: d(-8) },
];

export const DEMO_QUIZZES = [
  {
    id: "quiz-001", user_id: DEMO_USER.id, pack_id: "pack-001", pack_topic: "Porter's Five Forces", course_name: "Strategic Management",
    title: "Porter's Five Forces Quiz", num_questions: 5, status: "ready",
    questions: [
      { q: "Which of Porter's Five Forces directly examines competition from companies outside the current industry?", options: ["Competitive Rivalry", "Threat of New Entrants", "Threat of Substitutes", "Bargaining Power of Buyers"], answer: 2, explanation: "Threat of Substitutes examines products/services from OTHER industries that can fulfill the same customer need, unlike Competitive Rivalry which looks at current industry players." },
      { q: "A market with high fixed costs and slow industry growth will typically exhibit:", options: ["Low competitive rivalry", "High competitive rivalry", "Weak supplier power", "Low threat of substitutes"], answer: 1, explanation: "High fixed costs pressure firms to maximize volume to cover costs, while slow growth means firms must fight for each other's market share · both increase competitive rivalry." },
      { q: "Which factor would DECREASE Bargaining Power of Buyers?", options: ["Low switching costs", "Standardized products", "High buyer concentration", "High switching costs"], answer: 3, explanation: "High switching costs make it expensive for buyers to change suppliers, reducing their leverage and bargaining power." },
      { q: "In the UAE telecom industry, the duopoly of Etisalat (e&) and du represents:", options: ["Low competitive rivalry due to only 2 players", "High competitive rivalry due to mature market and regulatory constraints", "Threat of substitutes from internet calling apps", "High threat of new entrants"], answer: 1, explanation: "Even with only 2 players, a mature market with limited growth means both firms compete intensely for market share, creating high rivalry. Regulatory barriers also prevent price-based competition." },
      { q: "Porter's Five Forces is primarily used to:", options: ["Analyze a company's internal capabilities", "Evaluate industry attractiveness and competitive intensity", "Assess macroeconomic factors", "Determine optimal capital structure"], answer: 1, explanation: "Five Forces is an EXTERNAL analysis tool (industry-level), not internal. For internal analysis, use VRIO or Value Chain. For macro factors, use PESTLE." },
    ],
    created_at: d(-12),
  },
  {
    id: "quiz-002", user_id: DEMO_USER.id, pack_id: "pack-002", pack_topic: "DCF Valuation", course_name: "Financial Analysis",
    title: "DCF Valuation Fundamentals Quiz", num_questions: 5, status: "ready",
    questions: [
      { q: "In the FCF formula FCF = EBIT(1-t) + D&A − CapEx − ΔNWC, why is D&A added back?", options: ["Because it increases revenue", "Because it is a non-cash expense that reduces taxable income but not actual cash flow", "Because it represents future investment", "Because it reduces WACC"], answer: 1, explanation: "D&A is a non-cash accounting charge · it reduces EBIT but doesn't actually consume cash. So we add it back to get true cash flow." },
      { q: "If WACC = 10% and terminal growth rate = 2%, and next year's FCF = AED 100M, what is the Terminal Value?", options: ["AED 800M", "AED 1,000M", "AED 1,250M", "AED 500M"], answer: 2, explanation: "TV = FCF / (WACC − g) = 100 / (0.10 − 0.02) = 100 / 0.08 = AED 1,250M" },
      { q: "The terminal value in a typical DCF model represents approximately what percentage of total enterprise value?", options: ["10-20%", "30-40%", "60-80%", "90-100%"], answer: 2, explanation: "Terminal value typically represents 60-80% of total DCF enterprise value for mature companies, which is why small changes in WACC and growth rate assumptions are so impactful." },
      { q: "WACC should be used as the discount rate when:", options: ["Discounting equity cash flows", "Discounting free cash flows to the firm (FCFF)", "Calculating the risk-free rate", "Discounting dividends"], answer: 1, explanation: "WACC represents the return required by ALL capital providers (equity + debt). Use it to discount FCFF (firm-level cash flows). Use Cost of Equity to discount FCFE (equity-level cash flows)." },
      { q: "A company's beta (β) of 1.5 indicates:", options: ["The stock is 50% less volatile than the market", "The stock moves exactly with the market", "The stock is 50% more volatile than the market", "The company has 1.5x the industry average earnings"], answer: 2, explanation: "Beta measures systematic (market) risk. β > 1 means the stock amplifies market moves · a 10% market move implies a 15% stock move. Higher beta = higher required return in CAPM." },
    ],
    created_at: d(-10),
  },
];

export const DEMO_WEEKLY_BRIEF = {
  id: "wb-001",
  user_id: DEMO_USER.id,
  week_start: d(-BASE.getDay()),
  week_end: d(6 - BASE.getDay()),
  // Flat fields used by weekly-brief page UI
  focus_question_answer: "Porter's Five Forces Case Study (due May 8) must be your #1 focus today. Then Marketing Campaign Proposal (due May 9). Block 4 hours now for the Porter's case using Study Pack 1.",
  summary: "Critical week ahead with two at-risk deadlines. Digital Marketing (90%) and Operations (82%) are strong. Strategic Management needs urgent attention · overdue SWOT report must be submitted. Financial Analysis mid-term in 14 days with a format change requires early preparation.",
  readiness_score: 68,
  study_hours_target: 22,
  top_priorities: [
    "Submit overdue SWOT Analysis Report to Strategic Management TODAY",
    "Complete Porter's Five Forces Case Study (due May 8) · use Study Pack 1",
    "Finalize Marketing Campaign Proposal (due May 9) · Noon.com social strategy",
    "Begin Financial Modeling Assignment (due May 11) · DCF model skeleton",
  ],
  at_risk_items: [
    "Financial Analysis mid-term (May 20) · format changed to 2 case studies, 14 days to prepare",
    "Leadership & Org Behavior at 55% progress · below class average, essay due May 13",
    "Strategic Management: overdue SWOT report may affect participation grade",
  ],
  wins: [
    "Operations Lab Report · 91/100, strongest performance this semester",
    "Digital Marketing Campaign Concept · 88/100, excellent creative strategy",
    "4 of 9 kanban tasks completed on time this week",
  ],
  ai_recommendations: [
    "Use Porter's Five Forces Study Pack flashcards for 20 min before writing the case study",
    "Ask the AI Tutor: 'Compare Porter's Five Forces for UAE telecoms vs. aviation' to strengthen your analysis",
    "Generate a DCF quiz to self-test before the Financial Analysis mid-term",
    "Upload the HRM readings PDF to get a quick AI summary before writing the leadership essay",
  ],
  // Nested content for additional context
  content: {
    courses_status: "Digital Marketing (90%) and Operations (82%) on track. Strategic Management (78%) needs attention. Financial Analysis (65%) and Leadership & OB (55%) are at risk.",
    recommended_study_plan: "Today (Wed): 4h Porter's Case Study\nThu: Finalize + submit Porter's Case Study, start Marketing Proposal\nFri: Marketing Proposal final draft + submit\nSat: Begin DCF model for Financial Modeling\nSun: HRM Leadership Essay outline + FIN 502 Chapter 1-4 review\nMon-Tue: HRM Essay writing + exam prep",
    weekend_plan: "Sat: Submit Marketing Proposal by EOD. Begin DCF model skeleton.\nSun: Complete first draft of Financial Modeling Assignment. 2 hours Leadership & OB readings.",
    instructor_questions: [
      "Prof. Layla Hassan (FIN 502): Which DCF methods are tested · Exit Multiple or Gordon Growth Model?",
      "Dr. Khalid Al-Rashidi (MGMT 601): Is the overdue SWOT Analysis still accepted for partial credit?",
      "Dr. Rania Mostafa (MKT 604): Should the campaign proposal use a real UAE brand or fictional one?",
    ],
  },
  created_at: d(-BASE.getDay()),
};

export const DEMO_MESSAGES = [
  {
    id: "msg-001",
    thread_id: "thread-001",
    from_id: "instructor-001",
    from_name: "Dr. Khalid Al-Rashidi",
    from_role: "instructor",
    to_id: DEMO_USER.id,
    subject: "Re: SWOT Analysis Submission · Late Penalty Waiver",
    body: "Dear Sara,\n\nThank you for reaching out about your SWOT Analysis. I understand this has been a challenging week. Given your strong performance in the other assignments (78% overall), I am willing to waive 50% of the late penalty if you submit by tomorrow (Thursday, May 7) before 11:59 PM.\n\nPlease make sure the analysis covers:\n1. At least 4 points per quadrant\n2. UAE market context for the chosen company\n3. Strategic recommendations section (minimum 300 words)\n\nBest regards,\nDr. Khalid Al-Rashidi\nStrategic Management · MGMT 601",
    read: false,
    course_id: "course-001",
    course_name: "Strategic Management",
    created_at: d(-1, "T08:30:00.000Z"),
    ai_summary: "Dr. Al-Rashidi agreed to waive 50% of the late penalty if you submit the SWOT Analysis by Thursday May 7 at midnight. He requires 4+ points per SWOT quadrant, UAE market context, and a 300-word strategy section.",
    ai_reply_suggestion_en: "Dear Dr. Al-Rashidi,\n\nThank you so much for your understanding and for offering the penalty waiver. I truly appreciate your flexibility.\n\nI will submit the complete SWOT Analysis before 11:59 PM on Thursday, May 7. The report will include detailed analysis across all four quadrants with UAE market context and a comprehensive strategic recommendations section.\n\nThank you again for your support.\n\nBest regards,\nSara Al-Mansouri",
    ai_reply_suggestion_ar: "عزيزي الدكتور خالد،\n\nشكراً جزيلاً على تفهمكم ومرونتكم في منح التمديد. أقدر ذلك كثيراً.\n\nسأقوم بتسليم تحليل SWOT كاملاً قبل الساعة 11:59 مساءً يوم الخميس 7 مايو، متضمناً تحليلاً شاملاً لجميع العناصر الأربعة مع السياق الإماراتي وتوصيات استراتيجية وافية.\n\nشكراً مجدداً على دعمكم.\n\nمع أطيب التحيات،\nسارة المنصوري",
  },
  {
    id: "msg-002",
    thread_id: "thread-002",
    from_id: "instructor-002",
    from_name: "Prof. Layla Hassan",
    from_role: "instructor",
    to_id: DEMO_USER.id,
    subject: "Financial Analysis Mid-Term · Format Change Notice",
    body: "Dear Students,\n\nPlease note an important update regarding the upcoming Financial Analysis mid-term exam (May 20).\n\nThe format has been changed from multiple-choice questions to two comprehensive case studies:\n\nCase Study 1 (50 pts): DCF Valuation · you will be given a company's financials and asked to build a complete valuation model.\nCase Study 2 (50 pts): Ratio Analysis · comparative analysis of two UAE-listed companies.\n\nSample case studies are now available on the course portal. Please review the WACC and DCF chapters thoroughly.\n\nBest,\nProf. Layla Hassan\nFinancial Analysis · FIN 502",
    read: false,
    course_id: "course-002",
    course_name: "Financial Analysis",
    created_at: d(-2, "T14:00:00.000Z"),
    ai_summary: "The FIN 502 mid-term on May 20 changed format: now 2 case studies instead of MCQ. Case 1 = DCF valuation (50pts), Case 2 = ratio analysis of 2 UAE companies (50pts). Sample cases are on the portal.",
    ai_reply_suggestion_en: "Dear Prof. Hassan,\n\nThank you for the timely notification about the format change. I have noted the two case study structure and will begin reviewing the DCF and WACC chapters immediately.\n\nCould you please clarify whether the DCF case study will include a terminal value calculation, and if we should use the Gordon Growth Model or Exit Multiple approach?\n\nThank you for your guidance.\n\nBest regards,\nSara Al-Mansouri",
    ai_reply_suggestion_ar: "عزيزتي الأستاذة ليلى،\n\nشكراً للإخطار في الوقت المناسب عن تغيير الصيغة. سجّلت هيكل دراستَي الحالة وسأبدأ في مراجعة فصول DCF وWACC فوراً.\n\nهل يمكنكم توضيح ما إذا كانت دراسة الحالة الخاصة بـ DCF ستتضمن حساب القيمة الطرفية؟ وهل نستخدم نموذج نمو Gordon أم مضاعف الخروج؟\n\nشكراً على توجيهاتكم.\n\nمع أطيب التحيات،\nسارة المنصوري",
  },
  {
    id: "msg-003",
    thread_id: "thread-003",
    from_id: "admin-001",
    from_name: "Platform Admin",
    from_role: "admin",
    to_id: DEMO_USER.id,
    subject: "Your Pro Subscription is Active · Welcome to Maktab",
    body: "Dear Sara,\n\nWelcome to Maktab Learning OS · your Pro subscription is now active.\n\nYour plan includes:\n✓ 2,000 AI queries per month\n✓ Unlimited study pack generation\n✓ AI Tutor with RAG-powered answers\n✓ Smart deadline risk analysis\n✓ Priority support\n\nYou have used 47 of your 2,000 AI queries this month. Your subscription renews on May 31, 2026.\n\nIf you have any questions, reply to this message or visit the Help Center.\n\nBest,\nMaktab Team",
    read: true,
    course_id: null,
    course_name: null,
    created_at: d(-30, "T10:00:00.000Z"),
    ai_summary: "Welcome message confirming Sara's Pro plan is active: 2,000 AI queries/month, unlimited study packs, AI Tutor, and priority support. She has used 47 queries. Renewal on May 31.",
    ai_reply_suggestion_en: "Dear Maktab Team,\n\nThank you for the warm welcome! I am excited to start using the platform. The AI Tutor and study pack features look especially useful for my MBA coursework.\n\nLooking forward to a productive semester!\n\nBest regards,\nSara Al-Mansouri",
    ai_reply_suggestion_ar: "عزيز فريق Maktab،\n\nشكراً على الترحيب الحار! أنا متحمسة للبدء في استخدام المنصة. تبدو ميزات المعلم الذكي وحزم الدراسة مفيدة بشكل خاص لدراستي في الماجستير.\n\nأتطلع إلى فصل دراسي منتج!\n\nمع أطيب التحيات،\nسارة المنصوري",
  },
  {
    id: "msg-004",
    thread_id: "thread-004",
    from_id: "instructor-005",
    from_name: "Prof. Omar Shaikh",
    from_role: "instructor",
    to_id: DEMO_USER.id,
    subject: "Leadership Essay · Feedback on Outline",
    body: "Dear Sara,\n\nI reviewed the outline you submitted for the Leadership Essay. Overall it is a good start, but I have some suggestions:\n\n1. Strengthen your theoretical framework · consider applying Transformational vs. Transactional Leadership theory to the UAE context\n2. Your case selection is strong (Emirates Group is an excellent example), but add a contrasting company for comparative depth\n3. The conclusion should link back to your personal leadership philosophy\n\nThe essay is due May 13. You are currently at 55% progress in this course · this essay represents 20% of your final grade, so please give it the attention it deserves.\n\nFeel free to visit office hours (Sunday 2-4 PM) if you need further guidance.\n\nBest,\nProf. Omar Shaikh\nLeadership & Org Behavior · HRM 501",
    read: true,
    course_id: "course-005",
    course_name: "Leadership & Org Behavior",
    created_at: d(-3, "T16:00:00.000Z"),
    ai_summary: "Prof. Shaikh reviewed your Leadership Essay outline and suggested: (1) add Transformational vs. Transactional Leadership theory, (2) add a contrasting UAE company alongside Emirates Group, (3) link conclusion to personal leadership philosophy. Essay is 20% of grade, due May 13.",
    ai_reply_suggestion_en: "Dear Prof. Shaikh,\n\nThank you for the detailed feedback on my essay outline. Your suggestions are very helpful.\n\nI will incorporate the Transformational vs. Transactional Leadership framework and add Etihad Airways as a contrasting case to Emirates Group for comparative analysis. I will also strengthen the conclusion to reflect my personal leadership philosophy.\n\nI may attend your office hours on Sunday to discuss the theoretical framework further.\n\nThank you for your continued support.\n\nBest regards,\nSara Al-Mansouri",
    ai_reply_suggestion_ar: "عزيزي الأستاذ عمر،\n\nشكراً جزيلاً على ملاحظاتكم التفصيلية حول مخطط المقالة. اقتراحاتكم مفيدة جداً.\n\nسأدمج إطار القيادة التحويلية مقابل المعاملاتية وسأضيف الاتحاد للطيران كحالة مقارنة مع مجموعة الإمارات. كما سأعزز الخاتمة لتعكس فلسفتي القيادية الشخصية.\n\nقد أحضر ساعات مكتبكم يوم الأحد لمناقشة الإطار النظري.\n\nشكراً على دعمكم المستمر.\n\nمع أطيب التحيات،\nسارة المنصوري",
  },
];

export const DEMO_TUTOR_CHATS = [
  { id: "chat-001", user_id: DEMO_USER.id, course_id: "course-001", title: "Porter's Five Forces Discussion", created_at: d(-3), updated_at: d(-1) },
  { id: "chat-002", user_id: DEMO_USER.id, course_id: "course-002", title: "DCF Valuation Help", created_at: d(-5), updated_at: d(-2) },
];

// ─── Demo response helper ──────────────────────────────────────────────────────

type DemoKey =
  | "profile" | "subscription" | "courses" | "deadlines" | "announcements"
  | "tasks" | "grades" | "files" | "study-packs" | "flashcards" | "quizzes"
  | "weekly-brief" | "tutor-chats" | "messages" | "ok";

const DEMO_DATA: Record<DemoKey, unknown> = {
  profile: DEMO_PROFILE,
  subscription: DEMO_SUBSCRIPTION,
  courses: DEMO_COURSES,
  deadlines: DEMO_DEADLINES,
  announcements: DEMO_ANNOUNCEMENTS,
  tasks: DEMO_TASKS,
  grades: DEMO_GRADES,
  files: DEMO_FILES,
  "study-packs": DEMO_STUDY_PACKS,
  flashcards: DEMO_FLASHCARDS,
  quizzes: DEMO_QUIZZES,
  "weekly-brief": DEMO_WEEKLY_BRIEF,
  "tutor-chats": DEMO_TUTOR_CHATS,
  messages: DEMO_MESSAGES,
  ok: { ok: true },
};

export function demoReturn(key: DemoKey, status = 200): NextResponse | null {
  if (!isDemoMode) return null;
  return NextResponse.json(DEMO_DATA[key], { status });
}

// Filter deadlines by view param (mirrors the real API logic)
export function demoDeadlines(view: string | null): NextResponse | null {
  if (!isDemoMode) return null;
  const now = new Date();
  let result = DEMO_DEADLINES;
  if (view === "today") {
    result = DEMO_DEADLINES.filter(d => new Date(d.due_date) <= new Date(now.getTime() + 86_400_000));
  } else if (view === "week") {
    result = DEMO_DEADLINES.filter(d => new Date(d.due_date) <= new Date(now.getTime() + 7 * 86_400_000));
  } else if (view === "month") {
    result = DEMO_DEADLINES.filter(d => new Date(d.due_date) <= new Date(now.getTime() + 30 * 86_400_000));
  }
  // "all" or "at_risk" · return relevant subsets
  if (view === "at_risk") {
    result = DEMO_DEADLINES.filter(d => d.risk === "at_risk" || d.risk === "overdue");
  }
  return NextResponse.json(result);
}

// Return flashcards, optionally filtered by pack_id
export function demoFlashcards(packId: string | null): NextResponse | null {
  if (!isDemoMode) return null;
  const cards = packId ? DEMO_FLASHCARDS.filter(f => f.study_pack_id === packId) : DEMO_FLASHCARDS;
  return NextResponse.json(cards);
}
