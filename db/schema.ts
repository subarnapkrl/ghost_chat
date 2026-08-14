import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const messageStatus = pgEnum("message_status", [
  "active",
  "expired",
  "burned",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    chatName: text("chat_name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
    chatNameIdx: uniqueIndex("users_chat_name_idx").on(t.chatName),
  }),
);

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    userRoomIdx: uniqueIndex("room_members_user_room_idx").on(
      t.userId,
      t.roomId,
    ),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    status: messageStatus("status").notNull().default("active"),
    burnAfterRead: boolean("burn_after_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    readAt: timestamp("read_at"),
    readBy: uuid("read_by")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
  },
  (t) => ({
    roomStatusIdx: index("messages_room_status_idx").on(t.roomId, t.status),
    expiresAtIdx: index("messages_expires_at_idx").on(t.expiresAt),
  }),
);
