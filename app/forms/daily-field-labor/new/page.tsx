import DailyFieldLaborForm from "@/components/forms/DailyFieldLaborForm";
import { supabase } from "@/lib/db";

async function loadProjects() {
  const { data, error } = await supabase.from("projects").select("id, name, job_number, customer_gc").order("name", { ascending: true });
  if (error) return [];
  return data ?? [];
}

export default async function NewDailyFieldLaborPage() {
  const projects = await loadProjects();
  return <DailyFieldLaborForm projects={projects} />;
}
