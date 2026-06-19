import pdfplumber
path = "precios_boyaca/Resolucion-0033-2026.pdf"
with pdfplumber.open(path) as pdf:
    print(f"Total paginas: {len(pdf.pages)}")
    p0 = pdf.pages[0]
    text = p0.extract_text()
    tables = p0.extract_tables()
    print(f"Pag 1 texto: {len(text or '')} chars")
    print(f"Pag 1 tablas: {len(tables)}")
    if tables:
        for t in tables[:2]:
            print(f"  Filas: {len(t)}")
            if t:
                print(f"  Cols: {len(t[0])}")
            for r in t[:3]:
                print(f"    {[str(c)[:40] for c in r]}")
