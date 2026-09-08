import { NextResponse } from "next/server";
// URL → validate → fetch → validate response → filename → headers → return image
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing url parameter", {
        status: 400,
      });
    }

    // Only allow HTTP/HTTPS URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return new NextResponse("Invalid URL", {
        status: 400,
      });
    }

    const imageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EstateStager/1.0)",
      },
    });

    if (!imageRes.ok) {
      return new NextResponse("Failed to fetch image", {
        status: imageRes.status,
      });
    }

    const contentType =
      imageRes.headers.get("content-type") || "image/png";

    const buffer = await imageRes.arrayBuffer();

    // Get filename from URL
    let filename = "download.png";

    try {
      const pathname = new URL(url).pathname;
      const name = pathname.split("/").pop();

      if (name) {
        filename = name;
      }
    } catch {
      // Keep default filename
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[DOWNLOAD_PROXY]", error);

    return new NextResponse("Internal Error", {
      status: 500,
    });
  }
}