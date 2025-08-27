-- Thêm RLS policy cho UPDATE operations trên bảng trading_bots
-- Policy này cho phép user cập nhật bot của chính họ

CREATE POLICY "Enable update for users based on user_id" ON "public"."trading_bots"
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Nếu bạn muốn cho phép admin hoặc service role cập nhật tất cả bot
-- (để BotManager có thể hoạt động), hãy thêm policy này:
CREATE POLICY "Enable update for service role" ON "public"."trading_bots"
FOR UPDATE USING (auth.role() = 'service_role');


