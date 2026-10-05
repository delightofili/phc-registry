import { z } from "zod";
import { BloodGroup, Gender } from "@prisma/client";
import { calculateAge } from "./age";

const PHONE = /^(0[789][01]\d{8}|\+234[789][01]\d{8})$/;

const blankToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = toDate(s);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a real date")
  .transform(toDate);

const requiredText = (label: string, max = 100) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(2, `${label} is too short`)
    .max(max, `${label} is too long`);

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalCount = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(0).max(20).optional(),
);

export const immunizationSchema = z
  .object({
    vaccineName: requiredText("Vaccine name", 50),
    doseNumber: z.coerce.number().int().min(1).max(10).default(1),
    dateGiven: dateString,
    nextDueDate: z.preprocess(blankToUndefined, dateString.optional()),
  })
  .refine((v) => v.dateGiven <= new Date(), {
    message: "Date given cannot be in the future",
    path: ["dateGiven"],
  })
  .refine((v) => !v.nextDueDate || v.nextDueDate > v.dateGiven, {
    message: "Next due date must be after the date given",
    path: ["nextDueDate"],
  });

export const createPatientSchema = z
  .object({
    fullName: requiredText("Full name"),
    dateOfBirth: dateString.refine(
      (d) => d <= new Date(),
      "Date of birth cannot be in the future",
    ),
    gender: z.nativeEnum(Gender),
    phone: z.preprocess(
      blankToUndefined,
      z
        .string()
        .trim()
        .regex(PHONE, "Enter a valid Nigerian number, e.g. 08031234567")
        .optional(),
    ),
    village: requiredText("Village"),
    lga: requiredText("LGA"),
    state: requiredText("State"),
    nextOfKinName: requiredText("Next of kin name"),
    nextOfKinPhone: z
      .string({ required_error: "Next of kin phone is required" })
      .trim()
      .regex(PHONE, "Enter a valid Nigerian number, e.g. 08031234567"),
    nhisNumber: optionalText(30),
    bloodGroup: z.preprocess(
      blankToUndefined,
      z.nativeEnum(BloodGroup).optional(),
    ),
    allergies: optionalText(500),
    phcId: z.string().uuid("Invalid PHC id"),

    para: optionalCount,
    gravida: optionalCount,
    isPregnant: z.boolean().default(false),

    immunizations: z.array(immunizationSchema).max(30).optional(),
    confirmDuplicate: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    const age = calculateAge(d.dateOfBirth);
    const isFemaleOver12 =
      d.gender === Gender.FEMALE && age.unit === "years" && age.value > 12;
    const isUnder5 = age.unit === "months" || age.value < 5;

    if (!isFemaleOver12) {
      for (const field of ["para", "gravida"] as const) {
        if (d[field] !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is only for female patients over 12`,
          });
        }
      }
      if (d.isPregnant) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["isPregnant"],
          message: "Pregnancy is only for female patients over 12",
        });
      }
    }

    if (d.para !== undefined && d.gravida !== undefined && d.para > d.gravida) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["para"],
        message: "Para cannot be more than gravida",
      });
    }

    if (d.immunizations?.length && !isUnder5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["immunizations"],
        message: "Immunization records are only accepted for children under 5",
      });
    }

    d.immunizations?.forEach((imm, i) => {
      if (imm.dateGiven < d.dateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["immunizations", i, "dateGiven"],
          message: "Vaccine cannot be given before the date of birth",
        });
      }
    });
  });
