@@ .. @@
 -- Políticas para DELETE
 CREATE POLICY "units_delete_admin" ON units
   FOR DELETE TO authenticated
   USING (get_user_profile() = 'admin');