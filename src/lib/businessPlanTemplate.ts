import {
  BudgetItem,
  BusinessPlanContent,
  PlanImage,
  PlanSection,
  PlanType,
  Timetable,
  TimetableCell,
  TimetableRow,
} from "./types";
import { Lang } from "./i18n";

// [제목, 도움말] 쌍으로 언어별 템플릿을 정의한다.
type SectionDef = { title: string; hint: string };

const TEMPLATES: Record<Lang, Record<PlanType, SectionDef[]>> = {
  ko: {
    internal: [
      { title: "사업 개요", hint: "무엇을 하는 사업(행사)인지 한눈에 알 수 있도록 간단히 소개하세요." },
      { title: "목적 및 기대효과", hint: "왜 이 사업을 하는지, 무엇을 기대하는지 적어보세요." },
      { title: "세부 프로그램 내용", hint: "프로그램 구성과 진행 방식을 적어보세요." },
      { title: "추진 일정", hint: "날짜별·단계별 일정을 정리하세요." },
    ],
    external: [
      { title: "사업 개요", hint: "무엇을 하는 사업(행사)인지 한눈에 알 수 있도록 간단히 소개하세요." },
      { title: "문제 인식", hint: "고객이 겪고 있는 불편함이나 시장의 문제가 무엇인가요?" },
      { title: "시장 분석", hint: "목표 시장의 규모, 성장성, 경쟁 현황을 정리하세요." },
      { title: "제품/서비스 소개", hint: "제공하는 제품이나 서비스의 핵심 기능과 차별점을 설명하세요." },
      { title: "사업 모델(수익 구조)", hint: "어떻게 돈을 버는지, 가격 정책은 어떻게 되는지 설명하세요." },
      { title: "마케팅 전략", hint: "고객을 어떻게 확보하고 홍보할 계획인가요?" },
      { title: "재무 계획", hint: "초기 투자금, 예상 매출/비용, 손익분기점 등을 정리하세요." },
      { title: "팀 소개", hint: "핵심 인력의 역할과 경력을 소개하세요." },
    ],
    proposal: [
      { title: "제안 요약", hint: "무엇을 하는 단체(회사)인지, 무엇을 요청하는지, 무엇이 달라지는지, 왜 이 기업/기관인지 4가지로 한눈에 요약하세요." },
      { title: "시작하게 된 배경", hint: "이 일을 왜 시작했는지, 어떤 문제에 주목했는지 이야기로 풀어주세요." },
      { title: "함께하는 가치", hint: "제안 대상 기업/기관의 철학·가치와 우리 활동이 어떻게 맞닿는지 설명하세요." },
      { title: "단체·회사 소개", hint: "단체명, 설립연도, 법적 지위, 소재지 등 기본 정보를 소개하세요." },
      { title: "주요 인력", hint: "대표·핵심 인력의 역할과 경력을 소개하세요. (표로 정리하려면 일정표를 활용하세요)" },
      { title: "핵심 사업 소개", hint: "우리가 하는 주요 사업·활동을 정리하세요." },
      { title: "지원·협력 요청", hint: "구체적으로 무엇을 요청하는지 정리하세요. 금액은 아래 예산안에 작성하세요." },
      { title: "기대 효과", hint: "이 제안이 받아들여지면 무엇이 달라지는지 구체적으로 적으세요." },
      { title: "맺음말", hint: "함께하기를 바라는 마음을 담아 마무리하세요." },
    ],
    impact: [
      { title: "사업 요약", hint: "한 장으로 읽히게 쓰세요. 누구의 어떤 문제를, 어떤 근거로 확인했고, 무엇을 얼마나 바꾸겠다는 것인지. 뒤의 모든 항목은 이 요약을 증명하는 자료입니다." },
      { title: "문제 정의", hint: "무엇이 문제이고 왜 지금 중요한지를 느낌이 아니라 출처 있는 수치로 씁니다. 숫자 하나에 ①수치 ②비교 기준 ③의미를 함께 붙이세요. '고령화율 49.2%'만 쓰면 \"그래서?\"로 끝납니다. '전국 평균 21%의 2.3배로 전국 1위 — 독거어르신 고립이 가장 먼저 터질 지역'까지 써야 설득이 됩니다." },
      { title: "사업 대상", hint: "누구의 문제인가, 왜 다른 집단이 아니라 이 집단인가. 대상은 좁고 구체적일수록 강합니다. '청년'이 아니라 '시설 퇴소 후 자립준비청년', '노인'이 아니라 '대중교통이 닿지 않는 마을의 85세 이상 독거어르신'처럼 쓰세요." },
      { title: "문제의 규모와 심각성", hint: "몇 명·몇 가구인지(규모), 한 시점의 문제 정도가 얼마인지(심각도, 비율·점수), 몇 년째 이어지고 있는지(지속성, 연도별 추이)를 나눠 씁니다. 100명과 10만 명짜리 문제는 무게가 다르고, 올해 생긴 문제와 10년째인 문제도 다릅니다." },
      { title: "원인 분석", hint: "현상에서 '왜'를 반복해 내려가되 답마다 근거 자료를 붙입니다. 멈추는 지점은 다섯 번째가 아니라 '우리 사업으로 손댈 수 있고 근거가 있는 곳'입니다. 더 내려가면 인구 감소·가족 구조 변화 같은 구조적 원인이라 한 사업으로는 풀리지 않습니다." },
      { title: "주목할 원인", hint: "원인 후보를 늘어놓고 네 가지로 거르세요. ①사업으로 바꿀 수 있는 조건인가 ②우리 예산·인력·사업 기간 안에서 손이 닿는가 ③바꾸면 문제가 실제로 줄어든다는 근거가 있는가 ④바뀌었는지 지표로 확인할 수 있는가. 문제 정의는 객관적으로 하되, 우리 기관의 관점은 원인을 고를 때부터 넣습니다." },
      { title: "기존 대응 현황과 우리가 하는 이유", hint: "우리가 아니어도 누가 이미 하고 있지 않은지 확인하고, 비어 있는 자리를 짚으세요. 이미 하는 곳이 많아도 괜찮습니다 — 우리 미션·전문성·네트워크·현장 경험 때문에 우리가 할 때 달라지는 점이 있으면 그게 이유가 됩니다." },
      { title: "목표와 가설", hint: "한 문장으로 쓰세요. \"(원인)을 (방법)으로 개선하면, (대상)의 (문제 지표)가 (방향)으로 변화할 것이다.\" 목표는 이 문장을 수치로 바꾼 것입니다." },
      { title: "사업 내용", hint: "가설을 실행으로 옮긴 활동을 씁니다. 활동마다 어떤 원인을 겨냥하는지가 보여야 합니다. 개입 방식은 효과가 평가된 국내외 사례(평가 보고서, 체계적 문헌 고찰)에서 가져오면 그 자체가 근거가 됩니다." },
      { title: "추진 일정", hint: "준비·실행·평가를 단계별·월별로 정리하세요. 표로 만들려면 아래 일정표를 쓰면 됩니다." },
      { title: "성과 측정 계획", hint: "문제 지표를 뒤집으면 그대로 성과 지표가 됩니다. 앞에서 쓴 수치가 기준값(baseline)이고, '우울 16.1%'는 '참여자 우울 비율 감소'가 됩니다. 활동 결과(몇 건·몇 명) · 대상의 변화(태도·상태) · 궁극적 변화를 나눠 쓰고, 지표마다 측정 시점과 자료 출처를 적으세요." },
      { title: "예상 위험과 대응", hint: "기대와 다를 가능성을 씁니다. 어떤 가정이 틀리면 사업이 흔들리는지, 그때 무엇을 바꿀지. 숨기지 않고 쓸수록 심사자의 신뢰가 올라갑니다." },
      { title: "수행 역량", hint: "이 일을 우리가 해낼 수 있다는 근거를 씁니다. 비슷한 사업 실적, 담당 인력, 협력 기관, 현장 접근성. 금액은 아래 예산안에 작성하세요." },
      { title: "근거 자료 목록", hint: "인용한 수치마다 발표 기관, 조사 연도, 표본 수, 원문 링크를 적습니다. 기사 재인용이나 AI 요약이 아니라 원문을 직접 열어 확인한 것만 쓰세요. 확인 못 한 수치는 빼거나 '확인 불가'로 표시합니다." },
    ],
  },
  en: {
    internal: [
      { title: "Overview", hint: "Briefly introduce what this project (or event) is." },
      { title: "Goals & Expected Outcomes", hint: "Explain why you're doing this and what you expect." },
      { title: "Program Details", hint: "Describe the program structure and how it runs." },
      { title: "Schedule", hint: "Lay out the timeline by date and phase." },
    ],
    external: [
      { title: "Overview", hint: "Briefly introduce what this project is." },
      { title: "Problem", hint: "What pain point or market problem are customers facing?" },
      { title: "Market Analysis", hint: "Summarize target market size, growth, and competition." },
      { title: "Product / Service", hint: "Explain the core features and differentiators." },
      { title: "Business Model", hint: "Explain how you make money and your pricing." },
      { title: "Marketing Strategy", hint: "How will you acquire and reach customers?" },
      { title: "Financial Plan", hint: "Initial investment, projected revenue/costs, break-even." },
      { title: "Team", hint: "Introduce key people, their roles and experience." },
    ],
    proposal: [
      { title: "Proposal Summary", hint: "Summarize at a glance: what your org does, what you request, what changes, and why this company/partner." },
      { title: "Why We Began", hint: "Tell the story of why you started and the problem you focus on." },
      { title: "Shared Values", hint: "Explain how the partner's philosophy and values align with your work." },
      { title: "About Us", hint: "Introduce basics: name, founding year, legal status, location." },
      { title: "Our Team", hint: "Introduce key people, their roles and experience. (Use the timetable for a table.)" },
      { title: "What We Do", hint: "Summarize your main programs and activities." },
      { title: "Our Request", hint: "Clearly state what you're asking for. Put amounts in the Budget below." },
      { title: "Expected Impact", hint: "Concretely state what will change if this proposal is accepted." },
      { title: "Closing", hint: "Close with your hope to work together." },
    ],
    impact: [
      { title: "Summary", hint: "Make it readable on one page: whose problem, how you verified it, and what you will change by how much. Everything after this exists to prove this summary." },
      { title: "Problem Definition", hint: "State what the problem is and why it matters now — with sourced numbers, not impressions. Give every figure three parts: the number, a comparison, and the meaning. '49.2% elderly' alone invites \"so what?\". '2.3x the national average of 21%, highest in the country — this is where isolation breaks first' persuades." },
      { title: "Who This Is For", hint: "Whose problem is it, and why this group rather than another? Narrow and specific beats broad: not 'youth' but 'youth ageing out of care', not 'the elderly' but 'people over 85 living alone in villages public transit doesn't reach'." },
      { title: "Scale & Severity", hint: "Separate three things: how many people or households (scale), how bad it is at one point in time (severity, as a rate or score), and how long it has run (duration, year over year). A problem affecting 100 and one affecting 100,000 carry different weight." },
      { title: "Root Cause Analysis", hint: "Ask 'why' repeatedly down from the symptom, attaching evidence to each answer. Stop not at the fifth why but at the point your project can actually reach and evidence exists. Go further and you hit structural causes — population decline, family structure — that no single project solves." },
      { title: "The Cause You Target", hint: "List cause candidates and filter with four questions. (1) Can a project change this condition? (2) Is it within your budget, staff and timeline? (3) Is there evidence that changing it reduces the problem? (4) Can you verify the change with an indicator? Define the problem objectively, but bring your organization's perspective in here, when choosing the cause." },
      { title: "Existing Efforts & Why You", hint: "Check who is already doing this and name the gap. Crowded fields are fine — if your mission, expertise, network or field presence makes your version different, that difference is the answer." },
      { title: "Goal & Hypothesis", hint: "One sentence: \"If we improve (cause) through (method), then (target group)'s (problem indicator) will move (direction).\" Your goal is that sentence expressed as a number." },
      { title: "Activities", hint: "Turn the hypothesis into activities, and make clear which cause each one targets. Drawing your approach from interventions that have been evaluated (impact evaluations, systematic reviews) is itself evidence." },
      { title: "Timeline", hint: "Lay out preparation, delivery and evaluation by phase and month. Use the timetable below to show it as a table." },
      { title: "Measurement Plan", hint: "Flip the problem indicator and you have your outcome indicator. The figures you already cited become the baseline: 'depression 16.1%' becomes 'reduction in participant depression'. Separate outputs (counts), outcomes (change in the target group) and long-term impact, and note when and from what source each is measured." },
      { title: "Risks & Response", hint: "Say where reality may differ from expectation: which assumption, if wrong, destabilizes the project, and what you would change. Stating this openly raises reviewer confidence rather than lowering it." },
      { title: "Capacity to Deliver", hint: "Show evidence you can do this: comparable past work, assigned staff, partner organizations, access to the field. Put amounts in the Budget below." },
      { title: "Sources", hint: "For each figure, list the publishing body, survey year, sample size and a link to the original. Use only what you opened and read yourself — not a figure quoted in an article or summarized by AI. Drop anything you couldn't verify, or mark it as unverified." },
    ],
  },
};

// 저장된 문서의 섹션 제목으로 도움말을 찾는다 (양쪽 언어 모두 검색).
// 같은 제목("추진 일정")을 여러 유형이 쓰므로, 지금 고른 유형을 먼저 본다.
export function getSectionHint(
  title: string,
  planType?: PlanType
): string | undefined {
  const types = ["internal", "external", "proposal", "impact"] as PlanType[];
  const order = planType ? [planType, ...types.filter((t) => t !== planType)] : types;
  for (const lang of ["ko", "en"] as Lang[]) {
    for (const type of order) {
      const found = TEMPLATES[lang][type].find((s) => s.title === title);
      if (found) return found.hint;
    }
  }
  return undefined;
}

/** 내보낸 문서 머리말에 쓰는 유형 이름. */
const PLAN_TYPE_LABEL_KO: Record<PlanType, string> = {
  internal: "내부 기획안",
  external: "외부 기획안",
  proposal: "기업 제안서",
  impact: "임팩트 기획안",
};

export function planTypeLabelKo(planType: PlanType): string {
  return PLAN_TYPE_LABEL_KO[planType] ?? "외부 기획안";
}

export function emptyTimetable(): Timetable {
  return { days: [], rows: [] };
}

export function emptyContent(
  planType: PlanType,
  lang: Lang = "ko"
): BusinessPlanContent {
  const template = TEMPLATES[lang][planType];
  return {
    planType,
    sections: template.map((s) => ({ title: s.title, body: "" })),
    timetable: emptyTimetable(),
    budget: { total: 0, currency: "KRW", items: [] },
    images: [],
  };
}

// 이전 버전(고정 8개 항목) 데이터를 새 구조로 변환
const LEGACY_FIELD_LABELS: Array<[string, string]> = [
  ["overview", "사업 개요"],
  ["problem", "문제 인식"],
  ["market", "시장 분석"],
  ["product", "제품/서비스 소개"],
  ["businessModel", "사업 모델(수익 구조)"],
  ["marketing", "마케팅 전략"],
  ["finance", "재무 계획"],
  ["team", "팀 소개"],
];

export function normalizeContent(raw: unknown): BusinessPlanContent {
  const data = (raw ?? {}) as Record<string, unknown>;

  const rawBudget = (data.budget ?? {}) as Record<string, unknown>;
  const budget = {
    total: Number(rawBudget.total) || 0,
    currency: rawBudget.currency === "USD" ? ("USD" as const) : ("KRW" as const),
    items: Array.isArray(rawBudget.items)
      ? (rawBudget.items as Array<Record<string, unknown>>).map(
          (item): BudgetItem => ({
            name: String(item.name ?? ""),
            detail: String(item.detail ?? ""),
            amount: Number(item.amount) || 0,
            note: String(item.note ?? ""),
          })
        )
      : [],
  };

  const images: PlanImage[] = Array.isArray(data.images)
    ? (data.images as Array<Record<string, unknown>>)
        .filter((img) => typeof img.file === "string" && img.file)
        .map((img) => ({
          file: String(img.file),
          caption: String(img.caption ?? ""),
        }))
    : [];

  const rawTimetable = (data.timetable ?? {}) as Record<string, unknown>;
  const days: string[] = Array.isArray(rawTimetable.days)
    ? (rawTimetable.days as unknown[]).map((d) => String(d ?? ""))
    : [];

  // 구버전(문자열 셀)과 신버전(병합 정보 포함 객체 셀)을 모두 지원
  const toCell = (raw: unknown): TimetableCell => {
    if (typeof raw === "string") {
      return { text: raw, rowSpan: 1, colSpan: 1, hidden: false };
    }
    const c = (raw ?? {}) as Record<string, unknown>;
    return {
      text: String(c.text ?? ""),
      rowSpan: Math.max(1, Number(c.rowSpan) || 1),
      colSpan: Math.max(1, Number(c.colSpan) || 1),
      hidden: c.hidden === true,
    };
  };

  const timetable: Timetable = {
    days,
    rows: Array.isArray(rawTimetable.rows)
      ? (rawTimetable.rows as Array<Record<string, unknown>>).map(
          (row): TimetableRow => {
            const cells = Array.isArray(row.cells)
              ? (row.cells as unknown[]).map(toCell)
              : [];
            // 열 개수에 맞춰 셀 길이 보정
            while (cells.length < days.length) {
              cells.push({ text: "", rowSpan: 1, colSpan: 1, hidden: false });
            }
            return {
              time: String(row.time ?? ""),
              cells: cells.slice(0, days.length),
            };
          }
        )
      : [],
  };

  const normalizedType: PlanType =
    data.planType === "internal" ||
    data.planType === "proposal" ||
    data.planType === "impact"
      ? data.planType
      : "external";

  if (Array.isArray(data.sections)) {
    return {
      planType: normalizedType,
      sections: (data.sections as Array<Record<string, unknown>>).map((s) => ({
        title: String(s.title ?? ""),
        body: String(s.body ?? ""),
      })),
      timetable,
      budget,
      images,
    };
  }

  // 구버전 데이터: 값이 있는 항목만 섹션으로 변환, 하나도 없으면 외부 템플릿
  const sections: PlanSection[] = [];
  for (const [key, label] of LEGACY_FIELD_LABELS) {
    const body = typeof data[key] === "string" ? (data[key] as string) : "";
    sections.push({ title: label, body });
  }

  return { planType: "external", sections, timetable, budget, images };
}
