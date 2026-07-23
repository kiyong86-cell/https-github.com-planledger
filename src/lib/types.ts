export type BudgetItem = {
  name: string; // 프로그램/항목 이름
  detail: string; // 산출 내역 (예: 1인 1,000원 x 10명)
  amount: number; // 배정 금액
  note: string; // 비고
};

export type Budget = {
  total: number; // 총 예산
  items: BudgetItem[];
};

export type PlanSection = {
  title: string; // 주제 (자유롭게 수정 가능)
  body: string; // 내용
};

export type PlanImage = {
  file: string; // uploads 폴더에 저장된 파일명
  caption: string; // 사진 설명
};

export type TimetableCell = {
  text: string;
  rowSpan: number; // 세로 병합 칸 수 (기본 1)
  colSpan: number; // 가로 병합 칸 수 (기본 1)
  hidden: boolean; // 다른 셀의 병합 범위에 덮여 숨겨진 셀
};

export type TimetableRow = {
  time: string; // 예: 09:00-09:30
  cells: TimetableCell[]; // 날짜(열)별 내용, days 길이와 동일
};

export type Timetable = {
  days: string[]; // 열 제목, 예: 12일 (수)
  rows: TimetableRow[];
};

export type PlanType = "internal" | "external";

export type BusinessPlanContent = {
  planType: PlanType;
  sections: PlanSection[];
  timetable: Timetable;
  budget: Budget;
  images: PlanImage[];
};

export type BusinessPlan = {
  id: string;
  title: string;
  content: BusinessPlanContent;
  created_at: string;
  updated_at: string;
};

export type Receipt = {
  id: string;
  receipt_date: string;
  vendor: string | null;
  amount: number;
  category: string | null;
  memo: string | null;
  image_path: string | null;
  created_at: string;
};

export const RECEIPT_CATEGORIES = [
  "식비",
  "교통비",
  "사무용품",
  "마케팅",
  "출장비",
  "통신비",
  "임대료",
  "기타",
] as const;
