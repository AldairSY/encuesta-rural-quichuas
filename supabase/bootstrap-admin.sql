-- Run once in the Supabase SQL editor, replacing the email with your authorized address.
-- This does not create a password or send email. Only a confirmed Supabase Auth
-- user with this exact email can claim the enrollment at login.
insert into private.admin_enrollment(email_hash)
values(encode(extensions.digest(lower(trim('REEMPLAZAR_POR_CORREO_AUTORIZADO')),'sha256'),'hex'))
on conflict(email_hash) do nothing;
