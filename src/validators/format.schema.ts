import { z } from "zod";

const spacingRuleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  lineSpacing: z.number().positive().optional(),
  alignment: z.enum(["left", "right", "center", "justify"]).optional(),
  marginTop: z.string().optional(),
  marginBottom: z.string().optional(),
  marginLeft: z.string().optional(),
  marginRight: z.string().optional(),
  firstLineIndent: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  paragraphSpacing: z.number().positive().optional(),
  paragraphSpacingBefore: z.number().positive().optional(),
  paragraphSpacingAfter: z.number().positive().optional(),
});

export const formatRulesSchema = z.object({
  body: spacingRuleSchema.optional(),
  heading1: spacingRuleSchema.optional(),
  heading2: spacingRuleSchema.optional(),
  heading3: spacingRuleSchema.optional(),
  abstract: spacingRuleSchema.optional(),
  footnote: spacingRuleSchema.optional(),
  blockQuote: spacingRuleSchema.optional(),
  bibliography: spacingRuleSchema
    .extend({ hangingIndent: z.string().optional() })
    .optional(),
  pageNumbers: z
    .object({
      position: z.enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]).optional(),
      fontSize: z.number().positive().optional(),
    })
    .optional(),
}).passthrough();

export const createFormatSchema = z.object({
  name: z.string().min(1, "Format adı gereklidir.").max(200),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().optional().default(false),
  parentId: z.string().optional(),
  rules: formatRulesSchema.optional(),
});

export const updateFormatSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
  rules: formatRulesSchema.optional(),
});

export type CreateFormatInput = z.infer<typeof createFormatSchema>;
export type UpdateFormatInput = z.infer<typeof updateFormatSchema>;
