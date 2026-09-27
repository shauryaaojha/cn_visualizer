"use server";

import { revalidatePath } from "next/cache";
import { normSection, parseSectionSlug } from "@/lib/classReport";
import { addTeach, removeTeach, requireFaculty } from "@/lib/faculty";

export interface AddState {
  error?: string;
}

export async function addSection(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await requireFaculty("/faculty");
  const dept = String(form.get("dept") ?? "").slice(0, 40);
  const year = Number(form.get("year"));
  const section = String(form.get("section") ?? "").slice(0, 8);
  const s = normSection(dept, year, section);
  if (!s.dept || s.dept.includes("~")) return { error: "Enter the department, as students type it (e.g. CSE)." };
  if (!Number.isInteger(year) || year < 1 || year > 5) return { error: "Pick the year." };
  if (!/^[A-Z0-9-]{1,8}$/.test(s.section)) return { error: "Section should be short, like A1 or K2." };
  await addTeach(user._id.toHexString(), s);
  revalidatePath("/faculty");
  return {};
}

export async function removeSection(form: FormData): Promise<void> {
  const user = await requireFaculty("/faculty");
  const s = parseSectionSlug(String(form.get("slug") ?? ""));
  if (s) await removeTeach(user._id.toHexString(), s);
  revalidatePath("/faculty");
}
