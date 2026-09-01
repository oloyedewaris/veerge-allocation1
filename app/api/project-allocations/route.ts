const PROJECT_ALLOCATIONS_URL =
  "https://dev.matadortrust.com/v2/developers/project-allocations-with-owner/3230/";

export async function GET() {
  try {
    const response = await fetch(PROJECT_ALLOCATIONS_URL, { cache: "no-store" });
    if (!response.ok) {
      return Response.json(
        { error: "Unable to load project allocations" },
        { status: response.status },
      );
    }

    return Response.json(await response.json());
  } catch (error) {
    console.error("Project allocation request failed", error);
    return Response.json(
      { error: "Unable to load project allocations" },
      { status: 502 },
    );
  }
}
