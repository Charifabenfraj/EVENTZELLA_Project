import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path


def _clean_text(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_docx_without_dependency(path: Path) -> str:
    with zipfile.ZipFile(path, "r") as archive:
        xml_data = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    text = re.sub(r"<w:p[^>]*>", "\n", xml_data)
    text = re.sub(r"<[^>]+>", "", text)
    return _clean_text(text)


def _extract_with_textract(path: Path) -> str:
    try:
        import textract  # type: ignore
    except Exception:
        return ""

    try:
        data = textract.process(str(path))
        return _clean_text(data.decode("utf-8", errors="ignore"))
    except Exception:
        return ""


def _extract_with_antiword(path: Path) -> str:
    antiword = shutil.which("antiword")
    if not antiword:
        return ""

    try:
        result = subprocess.run(
            [antiword, str(path)],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
        )
        return _clean_text(result.stdout)
    except Exception:
        return ""


def _extract_with_word_com(path: Path) -> str:
    if os.name != "nt":
        return ""

    try:
        import win32com.client  # type: ignore
    except Exception:
        return ""

    temp_txt = None
    word_app = None
    doc = None
    try:
        fd, temp_name = tempfile.mkstemp(suffix=".txt")
        os.close(fd)
        temp_txt = Path(temp_name)

        word_app = win32com.client.Dispatch("Word.Application")
        word_app.Visible = False
        doc = word_app.Documents.Open(str(path), ReadOnly=True)
        # 2 = wdFormatText
        doc.SaveAs(str(temp_txt), FileFormat=2)
        text = temp_txt.read_text(encoding="utf-8", errors="ignore")
        return _clean_text(text)
    except Exception:
        return ""
    finally:
        try:
            if doc is not None:
                doc.Close(False)
        except Exception:
            pass
        try:
            if word_app is not None:
                word_app.Quit()
        except Exception:
            pass
        if temp_txt and temp_txt.exists():
            try:
                temp_txt.unlink()
            except Exception:
                pass


def _extract_fallback_strings(path: Path) -> str:
    data = path.read_bytes()
    # Last-resort fallback for binary .doc: keep readable segments.
    chunks = re.findall(rb"[\x20-\x7E]{20,}", data)
    decoded = [c.decode("latin-1", errors="ignore") for c in chunks]
    return _clean_text("\n".join(decoded[:400]))


def extract_report_text(path: Path) -> tuple[str, str]:
    suffix = path.suffix.lower()

    if suffix == ".docx":
        try:
            text = _extract_docx_without_dependency(path)
            if text:
                return text, "docx-zip"
        except Exception:
            pass

    for method_name, method in [
        ("textract", _extract_with_textract),
        ("word-com", _extract_with_word_com),
        ("antiword", _extract_with_antiword),
        ("fallback-strings", _extract_fallback_strings),
    ]:
        text = method(path)
        if text:
            return text, method_name

    return "", "none"


def main() -> int:
    parser = argparse.ArgumentParser(description="Read audit report file and extract plain text")
    parser.add_argument("report_path", help="Absolute path to .doc/.docx report")
    parser.add_argument("--max-chars", type=int, default=12000, help="Max extracted chars sent to AI")
    args = parser.parse_args()

    report_path = Path(args.report_path)
    if not report_path.exists() or not report_path.is_file():
        print(json.dumps({"ok": False, "error": f"Report file not found: {report_path}"}))
        return 1

    extracted_text, method = extract_report_text(report_path)
    if not extracted_text:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "Could not extract text from report file.",
                    "report_path": str(report_path),
                    "extract_method": method,
                }
            )
        )
        return 1

    max_chars = max(1000, int(args.max_chars or 12000))
    excerpt = extracted_text[:max_chars]

    payload = {
        "ok": True,
        "report_path": str(report_path),
        "file_name": report_path.name,
        "extract_method": method,
        "char_count_total": len(extracted_text),
        "char_count_excerpt": len(excerpt),
        "content_excerpt": excerpt,
    }
    print(json.dumps(payload, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
