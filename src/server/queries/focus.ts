import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { dayFocus } from "@/server/db/schema";

export async function getFocusForDate(
  date: string,
): Promise<string | undefined> {
  const rows = await db
    .select({ text: dayFocus.text })
    .from(dayFocus)
    .where(eq(dayFocus.date, date));
  return rows[0]?.text;
}
