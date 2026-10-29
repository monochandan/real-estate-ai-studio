
export class WorkerDispatchError extends Error {
  constructor(message, outcomeUnknown = false) {
    super(message);
    this.name = "WorkerDispatchError";
    this.outcomeUnknown = outcomeUnknown;
  }
}

export async function sendJobToPython(payload) {
  const workerUrl = process.env.PYTHON_WORKER_URL;
  const workerSecret = process.env.WORKER_SHARED_SECRET;

  console.log("Sending job to Python worker:", {
    jobId: payload.jobId,
  });

  if (!workerUrl || !workerSecret) {
    throw new WorkerDispatchError(
      "Python worker configuration is missing.",
      false
    );
  }

  let response;

  try {
    response = await fetch(`${workerUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": workerSecret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw new WorkerDispatchError(
      "Could not confirm whether the Python worker accepted the job.",
      true
    );
  }

  if (!response.ok) {
    const details = await response.text();

    throw new WorkerDispatchError(
      `Python worker rejected the job with HTTP ${response.status}: ${details}`,
      false
    );
  }

  try {
    const result = await response.json();

    if (result.accepted !== true || result.jobId !== payload.jobId) {
      throw new Error("Unexpected worker response.");
    }

    return result;
  } catch (error) {
    throw new WorkerDispatchError(
      "The worker response could not be verified.",
      true
    );
  }
}
