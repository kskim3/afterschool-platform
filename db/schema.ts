import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const schools = sqliteTable("schools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  district: text("district").notNull(),
  schoolType: text("school_type").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const courses = sqliteTable("courses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  section: text("section").notNull(),
  grades: text("grades").notNull(),
  schedule: text("schedule").notNull(),
  room: text("room").notNull(),
  tuition: integer("tuition").notNull().default(0),
  textbook: integer("textbook").notNull().default(0),
  materials: integer("materials").notNull().default(0),
  operatingFee: integer("operating_fee").notNull().default(0),
  weeks: integer("weeks").notNull().default(0),
  capacity: integer("capacity").notNull().default(0),
  applicants: integer("applicants").notNull().default(0),
  status: text("status").notNull().default("모집중"),
  selectionMethod: text("selection_method").notNull().default("선착순"),
  instructor: text("instructor").notNull().default(""),
  accent: text("accent").notNull().default("mint"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  grade: integer("grade").notNull(),
  className: text("class_name").notNull(),
  studentNumber: integer("student_number").notNull(),
  guardianPhone: text("guardian_phone").notNull(),
  supportType: text("support_type"),
  supportLimit: integer("support_limit").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  courseId: integer("course_id").notNull().references(() => courses.id),
  studentId: integer("student_id").notNull().references(() => students.id),
  status: text("status").notNull(),
  source: text("source").notNull().default("문자 URL"),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  tuitionSnapshot: integer("tuition_snapshot").notNull().default(0),
  textbookSnapshot: integer("textbook_snapshot").notNull().default(0),
  materialsSnapshot: integer("materials_snapshot").notNull().default(0),
  operatingSnapshot: integer("operating_snapshot").notNull().default(0),
  supportAmount: integer("support_amount").notNull().default(0),
  vendorGross: integer("vendor_gross"),
  vendorSupport: integer("vendor_support"),
  verifiedAt: text("verified_at"),
  idempotencyKey: text("idempotency_key").notNull(),
}, (table) => [
  uniqueIndex("applications_idempotency_key_unique").on(table.idempotencyKey),
]);

export const refunds = sqliteTable("refunds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  studentName: text("student_name").notNull(),
  courseName: text("course_name").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  title: text("title").notNull(),
  recipient: text("recipient").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const operationSettings = sqliteTable("operation_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
