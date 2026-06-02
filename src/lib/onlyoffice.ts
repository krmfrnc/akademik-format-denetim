import { SignJWT } from "jose";

interface OnlyOfficeDocumentConfig {
  key: string;
  title: string;
  url: string;
  fileType: string;
}

interface OnlyOfficePermissions {
  edit: boolean;
  download: boolean;
  print: boolean;
  comment: boolean;
}

interface OnlyOfficeEditorConfig {
  callbackUrl: string;
  user: {
    id: string;
    name: string;
  };
  lang?: string;
}

export interface OnlyOfficeTokenPayload {
  document: OnlyOfficeDocumentConfig;
  permissions: OnlyOfficePermissions;
  editorConfig: OnlyOfficeEditorConfig;
}

export async function signOnlyOfficeToken(
  payload: OnlyOfficeTokenPayload,
): Promise<string> {
  const secret = process.env.ONLYOFFICE_JWT_SECRET;
  if (!secret) {
    throw new Error("ONLYOFFICE_JWT_SECRET ortam değişkeni tanımlanmamış.");
  }

  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export function buildOnlyOfficeConfig(
  documentId: string,
  fileName: string,
  documentUrl: string,
  callbackUrl: string,
  userId: string,
  userName: string,
): OnlyOfficeTokenPayload {
  return {
    document: {
      key: documentId,
      title: fileName,
      url: documentUrl,
      fileType: "docx",
    },
    permissions: {
      edit: true,
      download: true,
      print: false,
      comment: false,
    },
    editorConfig: {
      callbackUrl,
      user: {
        id: userId,
        name: userName,
      },
      lang: "tr",
    },
  };
}