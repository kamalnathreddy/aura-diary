'use server'

import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteEntry(entryId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the entry belongs to the user before deleting
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  });

  if (!entry || entry.userId !== userId) {
    throw new Error("Unauthorized");
  }

  await prisma.entry.delete({
    where: { id: entryId },
  });

  revalidatePath('/'); // Refresh the page to show it's gone
  revalidatePath('/history');
}