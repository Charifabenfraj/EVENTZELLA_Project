import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from fpdf import FPDF

try:
    import sqlite3  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    # Some Python distributions are built without the stdlib sqlite3 module.
    # pysqlite3-binary provides a compatible drop-in replacement.
    import pysqlite3 as sqlite3  # type: ignore


AUDIT_TABLES = [
    "prediction_audit_log",
    "event_date_recommendation_audit",
    "demand_forecast_audit",
]


def _backend_dir() -> Path:
    # backend/scripts/monthly_bo_report.py -> backend/
    return Path(__file__).resolve().parents[1]


def _db_path() -> Path:
    return _backend_dir() / "db.sqlite3"


def _reports_dir() -> Path:
    return _backend_dir() / "reports"


def _month_window_utc(now: datetime) -> tuple[datetime, datetime]:
    # Compute [start_of_previous_month, start_of_current_month) in UTC.
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_utc = now.astimezone(timezone.utc)

    start_of_current_month = now_utc.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_last_day = start_of_current_month - timedelta(days=1)
    start_of_prev_month = last_month_last_day.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return start_of_prev_month, start_of_current_month


def _safe_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,)
    ).fetchone()
    return row is not None


def _table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    cols = []
    for row in conn.execute(f"PRAGMA table_info({table})").fetchall():
        # row = (cid, name, type, notnull, dflt_value, pk)
        cols.append(row[1])
    return cols


def _fetch_month_rows(conn: sqlite3.Connection, table: str, start_iso: str, end_iso: str) -> pd.DataFrame:
    if not _table_exists(conn, table):
        return pd.DataFrame()

    cols = _table_columns(conn, table)
    if not cols:
        return pd.DataFrame()

    # We assume created_at exists in audit tables; if not, just return all rows.
    where = ""
    params: tuple[str, str] | tuple[()] = tuple()
    if "created_at" in cols:
        where = " WHERE created_at >= ? AND created_at < ?"
        params = (start_iso, end_iso)

    sql = f"SELECT {', '.join(cols)} FROM {table}{where} ORDER BY created_at ASC"
    rows = conn.execute(sql, params).fetchall()
    return pd.DataFrame(rows, columns=cols)


def _write_pdf_summary(
    pdf_path: Path,
    period_label: str,
    generated_at: str,
    table_counts: dict[str, int],
) -> None:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Helvetica", size=16)
    pdf.cell(0, 10, "Eventzella - Monthly BO Report", ln=True)

    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 7, f"Period: {period_label}", ln=True)
    pdf.cell(0, 7, f"Generated at (UTC): {generated_at}", ln=True)
    pdf.ln(5)

    pdf.set_font("Helvetica", size=12)
    pdf.cell(0, 8, "Audit rows", ln=True)

    pdf.set_font("Helvetica", size=11)
    for table, count in table_counts.items():
        pdf.cell(0, 7, f"- {table}: {count}", ln=True)

    pdf.output(str(pdf_path))


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate monthly BO Excel+PDF from SQLite audits")
    parser.add_argument(
        "--db",
        default=str(_db_path()),
        help="Absolute path to backend/db.sqlite3 (defaults to repo backend/db.sqlite3)",
    )
    parser.add_argument(
        "--out-dir",
        default=str(_reports_dir()),
        help="Output directory for the report files (defaults to backend/reports)",
    )
    parser.add_argument(
        "--now-iso",
        default="",
        help="Override current time in ISO format (UTC recommended) for testing",
    )

    args = parser.parse_args()

    try:
        now = datetime.now(timezone.utc)
        if args.now_iso:
            now = datetime.fromisoformat(args.now_iso)

        start_dt, end_dt = _month_window_utc(now)
        start_iso = _safe_iso(start_dt)
        end_iso = _safe_iso(end_dt)
        period_label = start_dt.strftime("%Y-%m")
        generated_at = _safe_iso(datetime.now(timezone.utc))

        db_path = Path(args.db).expanduser().resolve()
        out_dir = Path(args.out_dir).expanduser().resolve()
        out_dir.mkdir(parents=True, exist_ok=True)

        xlsx_path = out_dir / f"bo_report_{period_label}.xlsx"
        pdf_path = out_dir / f"bo_report_{period_label}.pdf"

        if not db_path.exists():
            raise FileNotFoundError(f"SQLite DB not found: {db_path}")

        table_frames: dict[str, pd.DataFrame] = {}
        table_counts: dict[str, int] = {}

        conn = sqlite3.connect(str(db_path))
        try:
            for table in AUDIT_TABLES:
                df = _fetch_month_rows(conn, table, start_iso, end_iso)
                table_frames[table] = df
                table_counts[table] = int(len(df.index))
        finally:
            conn.close()

        with pd.ExcelWriter(str(xlsx_path), engine="openpyxl") as writer:
            summary_df = pd.DataFrame(
                [
                    {"key": "period", "value": period_label},
                    {"key": "window_start_utc", "value": start_iso},
                    {"key": "window_end_utc", "value": end_iso},
                    {"key": "generated_at_utc", "value": generated_at},
                    *[
                        {"key": f"rows_{table}", "value": table_counts.get(table, 0)}
                        for table in AUDIT_TABLES
                    ],
                ]
            )
            summary_df.to_excel(writer, sheet_name="summary", index=False)

            for table, df in table_frames.items():
                sheet_name = table[:31]
                (df if not df.empty else pd.DataFrame(columns=["(no rows)"])).to_excel(
                    writer, sheet_name=sheet_name, index=False
                )

        _write_pdf_summary(pdf_path, period_label, generated_at, table_counts)

        result = {
            "ok": True,
            "period": period_label,
            "window_start_utc": start_iso,
            "window_end_utc": end_iso,
            "generated_at_utc": generated_at,
            "db_path": str(db_path),
            "xlsx_path": str(xlsx_path),
            "pdf_path": str(pdf_path),
            "row_counts": table_counts,
        }
        print(json.dumps(result, ensure_ascii=False))
        return 0

    except Exception as exc:  # noqa: BLE001
        error_payload = {
            "ok": False,
            "error": str(exc),
        }
        print(json.dumps(error_payload, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
