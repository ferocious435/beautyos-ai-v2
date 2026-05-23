import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationSql = readFileSync(
  new URL('../supabase/migrations/20260523232000_smart_slots_by_service_duration.sql', import.meta.url),
  'utf8'
);
const schemaSql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

test('available slots use service duration and real overlaps', () => {
  for (const sql of [migrationSql, schemaSql]) {
    assert.match(sql, /get_available_slots\(m_id BIGINT, requested_service_id UUID, select_date DATE\)/);
    assert.match(sql, /FROM (public\.)?services[\s\S]*WHERE id = requested_service_id[\s\S]*AND master_id = master_uuid[\s\S]*AND is_active = TRUE/);
    assert.match(sql, /make_interval\(mins => service_duration_mins\)/);
    assert.ok(
      sql.includes("tstzrange(start_time, end_time, '[)') && tstzrange(current_time_slot, slot_end_time, '[)')")
    );
    assert.match(sql, /current_time_slot := current_time_slot \+ interval '15 minutes'/);
  }
});
