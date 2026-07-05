---
name: pdf-processing
description: Comprehensive PDF processing and generation capabilities for reading, creating, and manipulating PDFs
---

# PDF Processing Skill

## Overview

This skill covers comprehensive PDF processing: reading/extracting text and tables, merging/splitting documents, creating new PDFs, filling forms, OCR, and more.

## Core Capabilities

### Text & Data Extraction

**Tool: `pdfplumber`**
- Extract text while preserving layout and structure
- Extract tables with accurate formatting
- Locate text by coordinates (useful for form extraction)
- Preserve original document structure

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    page = pdf.pages[0]
    text = page.extract_text()
    tables = page.extract_tables()
```

### Document Manipulation

**Tool: `pypdf`** (formerly PyPDF2)
- Merge multiple PDFs into one
- Split PDFs into separate pages
- Rotate pages
- Add/remove passwords (encryption)
- Modify metadata

```python
from pypdf import PdfWriter, PdfReader

# Merge PDFs
merger = PdfWriter()
for pdf_file in ["file1.pdf", "file2.pdf"]:
    merger.append(pdf_file)
merger.write("merged.pdf")

# Split PDFs
reader = PdfReader("input.pdf")
writer = PdfWriter()
writer.add_page(reader.pages[0])
writer.write("page1.pdf")
```

### Content Creation

**Tool: `ReportLab`**
- Build PDFs from scratch with text, images, and complex layouts
- Create multi-page documents programmatically
- Add headers, footers, page numbers
- Position elements precisely

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

c = canvas.Canvas("output.pdf", pagesize=letter)
c.drawString(100, 750, "Hello World")
c.save()
```

### Image Extraction & OCR

- Extract images from PDFs programmatically
- Perform OCR on scanned PDFs to make them searchable
- Process multiple pages at scale

### Command-Line Tools (Batch Processing)

- **`qpdf`**: Merge, split, rotate, encrypt/decrypt PDFs
- **`pdftotext`**: Extract text from command line
- Useful for automation and batch jobs

## Important Unicode Warning ⚠️

**Do NOT use Unicode subscript/superscript characters in ReportLab PDFs.**

The built-in fonts do NOT include these glyphs, causing them to render as solid black boxes.

### ❌ Wrong:
```python
c.drawString(100, 750, "Water₂O")  # subscript 2
c.drawString(100, 700, "E=mc²")    # superscript 2
```

### ✅ Correct:
Use XML markup tags `<sub>` and `<super>` within Paragraph objects:

```python
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

style = ParagraphStyle('custom')
para = Paragraph("Water<sub>2</sub>O", style)
# or
para = Paragraph("E=mc<super>2</super>", style)
```

## Common PDF Operations

### Extracting Form Fields
Locate and extract data from PDF forms (see supplementary FORMS.md documentation).

### Watermarking
Add text or image watermarks to existing PDFs.

### Batch Processing
Combine multiple tools for automation:
```bash
# Extract text from all PDFs in a folder
for file in *.pdf; do
    pdftotext "$file" "${file%.pdf}.txt"
done
```

### PDF Merging with Bookmarks
Create a master PDF with bookmarks linking to merged sections.

## Library Comparison

| Task | Library | Why |
|---|---|---|
| Extract text/tables | `pdfplumber` | Preserves layout, accurate tables |
| Merge/split/rotate | `pypdf` | Simple, straightforward |
| Create from scratch | `ReportLab` | Full programmatic control |
| Batch via CLI | `qpdf`, `pdftotext` | Fast, scriptable |
| OCR on scans | Tesseract + `pytesseract` | Industry standard |

## Application to Code Destiny

Code Destiny generates PDF reports (e.g., life books, fortune cards):

- **Creating PDFs**: Use `ReportLab` for precise layout
- **Merging results**: `pypdf` for combining multiple pages
- **Extracting user data**: `pdfplumber` if parsing user-uploaded PDFs
- **Batch generation**: CLI tools for high-volume processing

### Example: Generating a Fortune Report

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

def create_fortune_report(user_name, fortune_text, output_file):
    c = canvas.Canvas(output_file, pagesize=A4)
    
    # Title
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, 750, "Your Fortune")
    
    # User name
    c.setFont("Helvetica", 12)
    c.drawString(50, 720, f"For: {user_name}")
    
    # Fortune text (wrapped)
    c.setFont("Helvetica", 11)
    text_lines = fortune_text.split('\n')
    y = 700
    for line in text_lines:
        c.drawString(50, y, line)
        y -= 20
    
    c.save()
```

## Best Practices

1. **Always use context managers** (`with` statement) when opening PDFs
2. **Validate input** before processing (file exists, is readable)
3. **Handle encoding carefully** when extracting text (UTF-8 default)
4. **Test with sample PDFs** before batch processing
5. **Memory consideration**: For large PDFs, process one page at a time
6. **Preserve metadata**: Consider copying metadata when modifying PDFs

## Error Handling

```python
import pdfplumber

try:
    with pdfplumber.open("document.pdf") as pdf:
        if len(pdf.pages) == 0:
            print("PDF has no pages")
        else:
            text = pdf.pages[0].extract_text()
except Exception as e:
    print(f"Error processing PDF: {e}")
```

## Resources

- **pdfplumber** docs: https://github.com/jsvine/pdfplumber
- **pypdf** docs: https://github.com/py-pdf/pypdf
- **ReportLab** docs: https://www.reportlab.com/docs/reportlab-userguide.pdf
- **Tesseract OCR**: https://github.com/tesseract-ocr/tesseract

---

**Use this skill when generating, reading, or manipulating PDF documents in Code Destiny.**
