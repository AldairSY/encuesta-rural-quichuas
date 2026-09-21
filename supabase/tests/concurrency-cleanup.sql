-- Only run after verifying rural_qa is the isolated fixture namespace created by this test.
-- No public or private production objects depend on this schema.
drop schema rural_qa cascade;
