#!/bin/bash
set -euo pipefail

export PGHOST="${PGHOST:-}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-}"
export PGPASSWORD="${PGPASSWORD:-}"
export PGDATABASE="${PGDATABASE:-postgres}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  eval "$(
    python3 - <<'PY'
from urllib.parse import urlparse
import os
parsed = urlparse(os.environ["DATABASE_URL"])
print(f'export PGHOST="{parsed.hostname or ""}"')
print(f'export PGPORT="{parsed.port or 5432}"')
print(f'export PGUSER="{parsed.username or ""}"')
print(f'export PGPASSWORD="{parsed.password or ""}"')
db_name = (parsed.path or "/postgres").lstrip("/") or "postgres"
print(f'export PGDATABASE="{db_name}"')
PY
  )"
fi

mkdir -p /var/lib/odoo /var/lib/odoo/sessions

exec odoo \
  --config=/etc/odoo/odoo.conf \
  --db_host="${PGHOST}" \
  --db_port="${PGPORT}" \
  --db_user="${PGUSER}" \
  --db_password="${PGPASSWORD}" \
  --database="${PGDATABASE}" \
  --http-port="${PORT:-8069}" \
  --init="${ODOO_INIT_MODULES:-assetflow_erp}" \
  --without-demo=all
