# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Independent job seekers who want to keep their career details in one place and tailor applications to specific roles. The initial product is optimized for one person managing their own job search.

## Product Purpose

Adaptive Resume helps a job seeker turn a job description into a role-specific resume draft using experience they have already recorded. Success means the user can review and edit a grounded draft, then export or share it with confidence.

## Positioning

The Data Bank is the reusable source for career facts. Resume drafts select and rephrase those facts for a role; they do not invent employers, titles, tools, responsibilities, or metrics. The person decides what to keep.

## Operating Context

The main workflow is: build a Data Bank from manual details, pasted career text, or a PDF/DOCX resume; review parsed details before saving; paste a job description; review tailored lines and their source; edit the resume; then export or share it. Applications and cover letters support the wider job search.

## Capabilities and Constraints

- Career records include experience, projects, education, skills, certifications, awards, volunteer work, and custom entries.
- PDF and DOCX resume text is extracted in the browser. Scanned PDFs and images require a separate OCR step with consent.
- Imported details remain staged until the user reviews and accepts them. The review must support editing before acceptance.
- Resume documents support contact details, a headline, summary, and links alongside career sections.
- Contact details remain private to the account unless the user explicitly publishes or shares them.
- GitHub repository import is available. The profile may store a public GitHub link; this is not the same as OAuth authorization.
- The PRD includes LinkedIn exports, job matching, resume versions, cover letters, application tracking, exports, and controlled sharing. Availability of individual items depends on the current implementation.
- Original uploaded files are not retained by default.

## Brand Commitments

- Product name: Adaptive Resume.
- Use plain, direct language that helps a job seeker understand what is saved, suggested, and shared.
- Preserve user control over contact data and every imported or tailored resume detail.

## Evidence on Hand

- `PRD.md` is the product requirements source.
- The repository contains the application UI, API routes, resume templates, and import parsers.
- No customer quotes, testimonials, logos, or measured performance claims were supplied. Do not invent them.

## Product Principles

1. Keep the Data Bank as the source of career facts.
2. Ask the user to review imported information before it enters the Data Bank.
3. Show where tailored resume content came from and let the user edit it.
4. Keep personal details private unless the user chooses to share them.
5. Use ordinary language for product states and actions.
