"""Sample pages 2-10 to understand structure"""
import pdfplumber
path = "precios_boyaca/Resolucion-0033-2026.pdf"
with pdfplumber.open(path) as pdf:
    for i in range(1, min(11, len(pdf.pages))):
        p = pdf.pages[i]
        text = p.extract_text()
        print(f"=== PAGE {i+1} ===")
        if text:
            print(text[:2000])
        print()
