import { redirect } from "next/navigation";

// Fitness ist in den Coach-Tab (Logbuch) integriert.
export default function FitnessPage() {
  redirect("/coach");
}
