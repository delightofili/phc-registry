# PHC Patient Registry - Digital System for Primary Health Centres

> Replacing paper registers with a fast, searchable digital system built for PHC workflows in Nigeria.

**Status:** Day 2/5 in progress | Live Demo: Coming Day 5 | Built in Public on LinkedIn

### Why This Exists

In many PHCs in Enugu / Anambra, patient records are still in paper books. Books get lost, wet, torn. Finding a returning patient takes 10 minutes of flipping pages. There is no way to quickly see who is due for immunization or which pregnant women need follow-up.

This project is a simple, fast registry that works on Android phones - because that's what PHC workers actually use.

### Live Demo

🚀 Coming Day 5 - Deploying to Vercel + Supabase

### Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **Validation:** Zod (server-side) + client-side conditional logic

### What I Built So Far

#### Day 1: Foundation

- Next.js 15 project setup with TypeScript
- Prisma schema design for Patient & PHC models
- Database connection with Supabase
- Initial Patient model with core fields: name, DOB, gender, village, phone, NHIS

#### Day 2: Real Clinical Logic (Feedback-Driven)

**Feedback from Blessing Nwoji (Product Manager - EdTech | HealthTech):**

> "Edge cases for gender should be included eg female - (para&gravida). If this includes children, immunization record should be included."

**Implemented:**

1. **Female Patients (ANC):** Added `para`, `gravida`, `isPregnant` to Patient model
   - Gravida = total pregnancies, Para = total births
   - Critical for antenatal care, a core PHC service

2. **Children Under 5 (Immunization):** Created `ImmunizationRecord` model
   - Linked to Patient (one patient -> many vaccines)
   - Fields: vaccineName (BCG, OPV, Penta), doseNumber, dateGiven, nextDueDate
   - Cascade delete: deleting patient deletes vaccine records

3. **PHC-Proof Features:**
   - Human-readable Card Numbers: `ANK-00042` instead of random UUIDs - nurses can write it on a card
   - Atomic Counter: Uses database transaction so 2 nurses registering at same time never get duplicate numbers
   - Smart Age: DOB stored, age calculated on demand. Shows "8 months" for babies, not "0 years"
   - One-Box Search: `GET /api/patients?q=` searches name, phone, NHIS, card number, case-insensitive, ignores phone spaces

4. **Server-Side Clinical Validation (not just UI hiding):**
   - Male patient marked pregnant -> 400 Rejected
   - Female <12 with gravida -> 400 Rejected
   - Para > Gravida -> 400 Rejected
   - Immunization for age >5 -> 400 Rejected
   - Vaccine date before birth date -> 400 Rejected
   - Next due date before date given -> 400 Rejected
   - Future DOB or invalid date like Feb 31 -> 400 Rejected
   - Nigerian phone format validation
   - Duplicate protection: Same name + DOB + village warns and shows existing patient
   - Unique NHIS enforcement

**API Endpoints:**

- `POST /api/patients` - Register patient
- `GET /api/patients?q=&page=` - Search & list with pagination
- `GET /api/phcs` - List health centres

**Testing:** 20+ requests via REST Client extension covering success, conflicts (409), bad input (400), missing PHC (404).

### Roadmap - 5 Day Build

- [x] Day 1: Setup & Base Model
- [x] Day 2: Clinical Logic + Feedback (Para/Gravida + Immunization)
- [ ] Day 3: Registration UI with conditional fields + Patient Detail Page
- [ ] Day 4: Visit/Encounters + Dashboard (Total, New today, Pregnant count, Under-5) + Print Patient Card
- [ ] Day 5: CSV Export for LGA reports + Deploy + Seed 20 Nigerian test patients

### How To Run Locally

```bash
git clone https://github.com/delightofili/phc-registry.git
npm install
# add DATABASE_URL in.env
npx prisma migrate dev
npx prisma db seed
npm run dev
```
