
import "server-only";

import { prisma } from "./prisma";
import { deleteVideoInputs } from "./uploadVideoInput";

export async function cleanupVideoInputs(jobId) {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      inputAssets: {
        include: {
          asset: {
            select: {
              id: true,
              type: true,
              storagePath: true,
              projectId: true,
              deletedAt: true,
              inputJobs: { select: { id: true } },
              outputJobs: { select: { id: true } },
              jobInputs: {
                select: { jobId: true },
              },
              versions: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new Error("Video generation job not found.");
  }

  if (
    job.type !== "VIDEO" ||
    job.status !== "COMPLETED" ||
    !job.outputAssetId
  ) {
    throw new Error(
      "Video inputs cannot be deleted before completion."
    );
  }

  const bucketPrefix = `${jobId}/`;
  const assets = job.inputAssets.map((item) => item.asset);

  // Never delete an asset used by another job,
  // another project, or a generated asset version.
  const safeAssets = assets.filter((asset) => {
    return (
      asset &&
      asset.type === "ORIGINAL_IMAGE" &&
      asset.projectId === job.projectId &&
      asset.storagePath?.startsWith(bucketPrefix) &&
      !asset.storagePath.includes("..") &&
      asset.inputJobs.length === 0 &&
      asset.outputJobs.length === 0 &&
      asset.versions.length === 0 &&
      asset.jobInputs.every((ref) => ref.jobId === jobId)
    );
  });

  if (safeAssets.length !== assets.length) {
    throw new Error(
      "Some video inputs are shared or have unsafe storage paths."
    );
  }

  if (safeAssets.length === 0) {
    return { deleted: 0 };
  }

  // Delete storage objects first. If this fails,
  // database records remain available for retry.
  await deleteVideoInputs(
    safeAssets.map((asset) => asset.storagePath)
  );

  // Remove temporary database records and their
  // GenerationJobInput relations.
  await prisma.$transaction(async (tx) => {
    for (const asset of safeAssets) {
      await tx.generationJobInput.deleteMany({
        where: {
          jobId,
          assetId: asset.id,
        },
      });

      await tx.asset.delete({
        where: { id: asset.id },
      });
    }

    const current = await tx.generationJob.findUnique({
      where: { id: jobId },
      select: { settings: true },
    });

    const settings =
      current?.settings &&
      typeof current.settings === "object" &&
      !Array.isArray(current.settings)
        ? { ...current.settings }
        : {};

    delete settings.inputStoragePaths;
    delete settings.imageUrls;
    delete settings.logoUrl;
    delete settings.logoStoragePath;

    await tx.generationJob.update({
      where: { id: jobId },
      data: { settings },
    });
  });

  return { deleted: safeAssets.length };
}
