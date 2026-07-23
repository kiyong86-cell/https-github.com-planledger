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

// 내부 기획안: 조직 안에서 공유하는 간단한 구성
export const INTERNAL_TEMPLATE: PlanSection[] = [
  { title: "사업 개요", body: "" },
  { title: "목적 및 기대효과", body: "" },
  { title: "세부 프로그램 내용", body: "" },
  { title: "추진 일정", body: "" },
];

// 외부 기획안: 투자·제출용 전체 구성
export const EXTERNAL_TEMPLATE: PlanSection[] = [
  { title: "사업 개요", body: "" },
  { title: "문제 인식", body: "" },
  { title: "시장 분석", body: "" },
  { title: "제품/서비스 소개", body: "" },
  { title: "사업 모델(수익 구조)", body: "" },
  { title: "마케팅 전략", body: "" },
  { title: "재무 계획", body: "" },
  { title: "팀 소개", body: "" },
];

// 기본 제목에 대한 입력 도움말 (제목을 바꾸면 일반 안내로 대체됨)
export const SECTION_HINTS: Record<string, string> = {
  "사업 개요": "무엇을 하는 사업(행사)인지 한눈에 알 수 있도록 간단히 소개하세요.",
  "목적 및 기대효과": "왜 이 사업을 하는지, 무엇을 기대하는지 적어보세요.",
  "세부 프로그램 내용": "프로그램 구성과 진행 방식을 적어보세요.",
  "추진 일정": "날짜별·단계별 일정을 정리하세요.",
  "문제 인식": "고객이 겪고 있는 불편함이나 시장의 문제가 무엇인가요?",
  "시장 분석": "목표 시장의 규모, 성장성, 경쟁 현황을 정리하세요.",
  "제품/서비스 소개": "제공하는 제품이나 서비스의 핵심 기능과 차별점을 설명하세요.",
  "사업 모델(수익 구조)": "어떻게 돈을 버는지, 가격 정책은 어떻게 되는지 설명하세요.",
  "마케팅 전략": "고객을 어떻게 확보하고 홍보할 계획인가요?",
  "재무 계획": "초기 투자금, 예상 매출/비용, 손익분기점 등을 정리하세요.",
  "팀 소개": "핵심 인력의 역할과 경력을 소개하세요.",
};

export function emptyTimetable(): Timetable {
  return { days: [], rows: [] };
}

export function emptyContent(planType: PlanType): BusinessPlanContent {
  const template =
    planType === "internal" ? INTERNAL_TEMPLATE : EXTERNAL_TEMPLATE;
  return {
    planType,
    sections: template.map((s) => ({ ...s })),
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

  if (Array.isArray(data.sections)) {
    return {
      planType: data.planType === "internal" ? "internal" : "external",
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
