import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { uploadToStorageServer } from "@/lib/storage-client";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const body = await request.arrayBuffer();
    const contentLength = request.headers.get("content-length");

    if (!body || body.byteLength === 0) {
      console.error("Callback: boş body geldi");
      return new Response("{\"error\":1}", { status: 400 });
    }

    const document = await prisma.document.findFirst({
      where: { id: params.id },
      select: { userId: true, fileUrl: true },
    });

    if (!document) {
      console.error("Callback: belge bulunamadı:", params.id);
      return new Response("{\"error\":1}", { status: 404 });
    }

    let fileUrl: string;

    if (document.fileUrl.startsWith("/storage/")) {
      const uniqueName = `${params.id}_updated.docx`;
      fileUrl = await uploadToStorageServer(document.userId, uniqueName, body);
    } else {
      const blob = await put(`${params.id}_updated.docx`, body, {
        access: "public",
      });
      fileUrl = blob.url;
    }

    console.log(`Callback: dosya kaydedildi - ${fileUrl} (${contentLength} bytes)`);

    return new Response("{\"error\":0}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response("{\"error\":1}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  return new Response("{\"error\":0}", {
    headers: { "Content-Type": "application/json" },
  });
}