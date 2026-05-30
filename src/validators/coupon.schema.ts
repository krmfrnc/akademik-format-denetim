import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Kupon kodu gereklidir."),
  cartType: z.enum(["SUBSCRIPTION", "CREDIT_PACKAGE"], {
    required_error: "Sepet tipi gereklidir.",
    invalid_type_error: "Geçersiz sepet tipi.",
  }),
  cartAmount: z.number().min(0, "Sepet tutarı 0'dan küçük olamaz."),
  planId: z.string().optional(),
  packageId: z.string().optional(),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
