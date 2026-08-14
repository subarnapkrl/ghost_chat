import { z } from "zod";

export const chatNameSchema = z
  .string()
  .trim()
  .min(3, "Chat name must be at least 3 characters ")
  .max(10, "Chat name must not exceed more than 10 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Chat name can only contain letters, numbers, and underscores.",
  );

export const emailSchema = z.string().trim().toLowerCase().email();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  chatName: chatNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
