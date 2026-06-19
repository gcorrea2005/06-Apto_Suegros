"""Convertir Anexos APU Boyacá PDF a Markdown"""
import pdfplumber
import sys
import re

def clean(text: str) -> str:
    text = text.replace('\u0000', '').replace('\ufffe', '')
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text.strip()

def extract_tables(path: str):
    with pdfplumber.open(path) as pdf:
        total = len(pdf.pages)
        print(f"Procesando {total} páginas...\n")
        for i, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            text = page.extract_text()
            has_data = False

            if text and text.strip():
                has_data = True
                print(f"## Página {i}\n")
                print(clean(text) + "\n")

            if tables:
                for ti, table in enumerate(tables):
                    if not table or len(table) < 2:
                        continue
                    has_data = True
                    if not (text and text.strip()):
                        print(f"## Página {i}\n")
                    header = table[0]
                    rows = table[1:]
                    print("| " + " | ".join(str(c or "") for c in header) + " |")
                    print("|" + "|".join("---" for _ in header) + "|")
                    for row in rows:
                        vals = [str(c or "").replace("\n", " ") for c in row]
                        print("| " + " | ".join(vals) + " |")
                    print()

            if not has_data:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    print(f"## Página {i}\n")
                    print(clean(page_text) + "\n")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "Resolucion-0033-2026.pdf"
    extract_tables(path)
