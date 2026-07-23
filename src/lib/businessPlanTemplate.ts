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
