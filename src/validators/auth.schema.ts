import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz.")
    .max(255, "E-posta 255 karakterden uzun olamaz."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .max(128, "Şifre 128 karakterden uzun olamaz."),
  name: z
    .string()
    .min(2, "Ad en az 2 karakter olmalıdır.")
    .max(100, "Ad 100 karakterden uzun olamaz."),
  surname: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre gereklidir."),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token gereklidir."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
