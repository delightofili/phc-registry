export type Age = { value: number; unit: "months" | "years"; label: string };

export function calculateAge(dob: Date, today: Date = new Date()): Age {
  let years = today.getUTCFullYear() - dob.getUTCFullYear();
  let months = today.getUTCMonth() - dob.getUTCMonth();
  if (today.getUTCDate() < dob.getUTCDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 1) {
    return {
      value: months,
      unit: "months",
      label: `${months} ${months === 1 ? "month" : "months"}`,
    };
  }
  return {
    value: years,
    unit: "years",
    label: `${years} ${years === 1 ? "year" : "years"}`,
  };
}
