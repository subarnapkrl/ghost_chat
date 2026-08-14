import z from "zod";
import { MAX_TTL_SEXONDS, MIN_TTL_SECONDS } from "../ttl";

export const createMessageSchema = z.object({
  clientMessageId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  ttlSeconds: z.number().int().min(MIN_TTL_SECONDS).max(MAX_TTL_SEXONDS),
  burnAfterRead: z.boolean().optional().default(false),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
