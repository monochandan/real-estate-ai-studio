export async function sendJobToPython(payload) {
  const workerUrl = process.env.PYTHON_WORKER_URL;
  const workerSecret = process.env.WORKER_SHARED_SECRET;

  if (!workerUrl || !workerSecret) {
    throw new Error("Python worker configuration is missing.");
  }

  const response = await fetch(`${workerUrl}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Worker-Secret": workerSecret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Python worker rejected the job: ${details}`);
  }

  return response.json();
}