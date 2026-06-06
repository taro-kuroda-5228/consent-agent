-- Allow anonymous demo / service-role review records without an auth profile.
-- Physician identity is still represented in the application audit metadata for the hackathon demo.
alter table public.physician_reviews
  alter column reviewed_by drop not null;
