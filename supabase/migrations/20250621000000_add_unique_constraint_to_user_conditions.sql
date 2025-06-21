alter table public.user_conditions
add constraint user_conditions_user_id_name_key unique (user_id, name); 