-- TableOrder PostgreSQL Schema
-- Multi-tenant restaurant ordering platform with anti-spoofing audit trail

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Venues (multi-tenant root) ───────────────────────────────────────────

CREATE TABLE venues (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  -- Registered GPS coordinates for proximity validation (Gate 3)
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  proximity_radius_meters INTEGER NOT NULL DEFAULT 100,
  currency      TEXT NOT NULL DEFAULT 'TND',
  timezone      TEXT NOT NULL DEFAULT 'Africa/Tunis',
  plan          TEXT NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'premium')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE venue_tables (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_number  INTEGER NOT NULL,
  label         TEXT,
  qr_code_url   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, table_number)
);

-- ─── Staff accounts ───────────────────────────────────────────────────────

CREATE TABLE staff_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'manager', 'owner')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, email)
);

-- ─── Menu ─────────────────────────────────────────────────────────────────

CREATE TABLE menu_categories (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  -- Time-based menus: null = always available
  available_from TIME,
  available_until TIME,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id   UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  venue_id      UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10, 3) NOT NULL,
  photo_url     TEXT,
  dietary_tags  TEXT[] DEFAULT '{}',
  is_available  BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE menu_modifiers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id       UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'single' CHECK (type IN ('single', 'multiple')),
  is_required   BOOLEAN NOT NULL DEFAULT false,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE menu_modifier_options (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_id   UUID NOT NULL REFERENCES menu_modifiers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price_delta   NUMERIC(10, 3) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0
);

-- ─── Security: order sessions (Gate 1–3 audit trail) ─────────────────────

CREATE TABLE order_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id        UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  -- GPS at scan time (Gate 1)
  scan_latitude   DOUBLE PRECISION NOT NULL,
  scan_longitude  DOUBLE PRECISION NOT NULL,
  scan_accuracy   DOUBLE PRECISION,
  -- Device fingerprint for pattern monitoring (Gate 4)
  device_fingerprint TEXT,
  ip_address      INET,
  user_agent      TEXT,
  -- Token lifecycle
  token_jti       TEXT NOT NULL UNIQUE,
  token_issued_at TIMESTAMPTZ NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  token_used_at   TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'used', 'expired', 'blocked', 'gps_denied')),
  -- GPS at order submission (for drift detection)
  order_latitude  DOUBLE PRECISION,
  order_longitude DOUBLE PRECISION,
  distance_from_venue_meters DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_sessions_venue ON order_sessions(venue_id);
CREATE INDEX idx_order_sessions_table ON order_sessions(table_id);
CREATE INDEX idx_order_sessions_status ON order_sessions(status);
CREATE INDEX idx_order_sessions_jti ON order_sessions(token_jti);

-- ─── Security alerts (Gate 4 pattern monitor) ─────────────────────────────

CREATE TABLE security_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES order_sessions(id) ON DELETE SET NULL,
  alert_type      TEXT NOT NULL CHECK (alert_type IN (
    'gps_denied',
    'location_too_far',
    'token_expired',
    'token_reuse',
    'gps_drift',
    'multi_location_device',
    'high_scan_volume_ip',
    'suspicious_pattern'
  )),
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description     TEXT NOT NULL,
  metadata        JSONB DEFAULT '{}',
  -- Manager review workflow
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'blocked', 'dismissed')),
  reviewed_by     UUID REFERENCES staff_users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_alerts_venue ON security_alerts(venue_id);
CREATE INDEX idx_security_alerts_status ON security_alerts(status);

-- ─── Orders ───────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id        UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES order_sessions(id) ON DELETE SET NULL,
  order_number    SERIAL,
  status          TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'preparing', 'ready', 'delivered', 'cancelled')),
  payment_method  TEXT CHECK (payment_method IN ('card', 'pay_at_table')),
  payment_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  subtotal        NUMERIC(10, 3) NOT NULL DEFAULT 0,
  total           NUMERIC(10, 3) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_venue ON orders(venue_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_id);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  item_name       TEXT NOT NULL,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10, 3) NOT NULL,
  modifiers       JSONB DEFAULT '[]',
  notes           TEXT,
  line_total      NUMERIC(10, 3) NOT NULL
);

-- ─── Daily analytics archive ──────────────────────────────────────────────

CREATE TABLE daily_summaries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  summary_date    DATE NOT NULL,
  total_revenue   NUMERIC(12, 3) NOT NULL DEFAULT 0,
  order_count     INTEGER NOT NULL DEFAULT 0,
  avg_order_value NUMERIC(10, 3) NOT NULL DEFAULT 0,
  hourly_breakdown JSONB DEFAULT '{}',
  item_stats      JSONB DEFAULT '{}',
  table_stats     JSONB DEFAULT '{}',
  category_stats  JSONB DEFAULT '{}',
  security_stats  JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (venue_id, summary_date)
);

-- ─── Updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venues_updated_at BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
