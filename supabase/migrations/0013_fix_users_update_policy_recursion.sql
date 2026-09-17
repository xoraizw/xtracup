drop policy if exists "users update own profile" on users;

create policy "users update own profile"
  on users for update
  to authenticated
  using (id = (auth.jwt()->>'sub'))
  with check (
    id = (auth.jwt()->>'sub')
    and role = current_user_role()
    and branch_id is not distinct from current_user_branch_id()
  );
