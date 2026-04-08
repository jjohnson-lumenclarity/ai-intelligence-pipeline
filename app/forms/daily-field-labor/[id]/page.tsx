import { notFound } from "next/navigation";
import DailyFieldLaborForm from "@/components/forms/DailyFieldLaborForm";
import { getDailyFieldReport } from "@/lib/forms/repository";
import { supabase } from "@/lib/db";

async function loadProjects() {
  const { data, error } = await supabase.from("projects").select("id, name, job_number, customer_gc").order("name", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export default async function DailyFieldLaborDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [report, projects] = await Promise.all([getDailyFieldReport(id), loadProjects()]);

  if (!report) {
    notFound();
  }

  return <DailyFieldLaborForm initialReport={report} projects={projects} />;
}
