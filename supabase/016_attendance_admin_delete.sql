-- 관리자 출석 취소: attendance_records 삭제 허용
drop policy if exists "attendance_delete_admin" on public.attendance_records;
create policy "attendance_delete_admin"
  on public.attendance_records for delete to authenticated
  using (public.is_admin());
