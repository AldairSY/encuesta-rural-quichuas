begin;
with attempt as materialized (select rural_qa.registrar_participacion('00000008','Concurrencia','Prueba Dos','',
 (select id from rural_qa.centros_poblados limit 1),(select id from rural_qa.encuestas limit 1),(select id from rural_qa.candidatos limit 1),
 'qa-concurrent-ip','qa-concurrent-device',gen_random_uuid(),'QA CONCURRENCIA','1.0',true) as result), delay as materialized (select pg_sleep(3) from attempt)
select pg_backend_pid() as connection,result from attempt,delay;
commit;
