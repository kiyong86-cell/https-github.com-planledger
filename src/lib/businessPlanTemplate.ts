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
      { title: "제안 배경", hint: "왜 이 제안을 하게 되었는지, 상대 기업의 어떤 니즈에 주목했는지 적으세요." },
      { title: "제안 개요", hint: "무엇을 제안하는지 핵심을 한눈에 알 수 있게 요약하세요." },
      { title: "기대 효과", hint: "제안을 받아들이면 상대 기업이 얻는 이점을 구체적으로 적으세요." },
      { title: "추진 방안", hint: "어떻게 진행할지, 단계와 역할 분담을 정리하세요." },
      { title: "협력 조건", hint: "비용, 기간, 협력 형태 등 조건을 정리하세요." },
      { title: "회사 소개", hint: "우리 회사(또는 단체)의 강점과 실적을 소개하세요." },
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
      { title: "Background", hint: "Why you're making this proposal and which of their needs it addresses." },
      { title: "Proposal Summary", hint: "Summarize what you propose at a glance." },
      { title: "Expected Benefits", hint: "Concretely state what the company gains by accepting." },
      { title: "Approach", hint: "How you'll proceed — phases and responsibilities." },
      { title: "Terms", hint: "Cost, duration, form of collaboration, etc." },
      { title: "About Us", hint: "Introduce your company's (or org's) strengths and track record." },
    ],
  },
};

// 저장된 문서의 섹션 제목으로 도움말을 찾는다 (양쪽 언어 모두 검색).
export function getSectionHint(title: string): string | undefined {
  for (const lang of ["ko", "en"] as Lang[]) {
    for (const type of ["internal", "external", "proposal"] as PlanType[]) {
      const found = TEMPLATES[lang][type].find((s) => s.title === title);
      if (found) return found.hint;
    }
  }
  return undefined;
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
    budget: { total: 0, items: [] },
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
    data.planType === "internal"
      ? "internal"
      : data.planType === "proposal"
        ? "proposal"
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
