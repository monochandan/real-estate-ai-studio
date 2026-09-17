import { prisma } from "@/lib/prisma";
// Create one central credit service on 
// the server rather than having every API route directly manipulate Prisma.
export async function getUserCredits(userId) {
// get the current credits from database of the user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user.credits;
}

export async function addCredits(userId, amount) {
    // add credits in the database for this user
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid credit amount");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      credits: {
        increment: amount,
      },
    },
    select: {
      credits: true,
    },
  });

  return user.credits;
}

export async function consumeCredits(userId, amount = 1) {
    // consuemnd credit for this AI task
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid credit amount");
  }

  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      credits: {
        gte: amount,
      },
    },
    data: {
      credits: {
        decrement: amount,
      },
    },
  });

  if (result.count === 0) {
    throw new Error("Insufficient credits");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
    },
  });

  return user.credits;
}