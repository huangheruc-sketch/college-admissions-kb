#!/usr/bin/env python3
"""
Parse academic-data.md files from all schools and produce
wiki/data/explorers/academic-programs.json

Unified schema per record:
{
  "school": "MIT",
  "school_slug": "mit",
  "program_name": "Computer Science and Engineering",
  "original_label": "major|concentration|option",
  "division": "School of Engineering",       # school/college/division grouping
  "degree": "S.B.",
  "degree_category": "BS",                   # normalized: BA / BS / BSE / AB / SB / Other
  "discipline_area": "Engineering",           # from table heading context
  "undergrad_open": true,
  "source_page": "#/schools/mit/academic-data"
}
"""
import json, re, sys, os
from pathlib import Path
from datetime import datetime, timezone

WIKI = Path(__file__).resolve().parent.parent
SCHOOLS_DIR = WIKI / "schools"
OUT = WIKI / "data" / "explorers" / "academic-programs.json"

SCHOOL_DISPLAY = {
    "mit": "MIT", "harvard": "Harvard", "stanford": "Stanford",
    "princeton": "Princeton", "caltech": "Caltech", "yale": "Yale",
    "columbia": "Columbia", "cornell": "Cornell", "uc-berkeley": "UC Berkeley",
    "uchicago": "UChicago", "ucla": "UCLA",
}

# Maps each school to how they name their major equivalent
ORIGINAL_LABELS = {
    "mit": "major", "harvard": "concentration", "stanford": "major",
    "princeton": "concentration", "caltech": "option", "yale": "major",
    "columbia": "major", "cornell": "major", "uc-berkeley": "major",
    "uchicago": "major", "ucla": "major",
}

def normalize_degree_category(deg: str) -> str:
    d = deg.strip().upper().replace(".", "")
    mapping = {
        "BA": "BA", "AB": "BA", "BS": "BS", "SB": "BS",
        "BSE": "BSE", "BFA": "BFA", "BARCH": "BArch",
        "BM": "BM",
    }
    for k, v in mapping.items():
        if k in d:
            return v
    return deg.strip() if deg.strip() else "Unknown"

def clean(s: str) -> str:
    return s.strip().strip("*").strip()

def parse_table_rows(lines: list[str]) -> list[list[str]]:
    """Extract rows from markdown table lines (skip header separator)."""
    rows = []
    for line in lines:
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [clean(c) for c in line.split("|")[1:-1]]
        # skip separator rows like |---|---|
        if all(re.match(r'^[-:]+$', c) for c in cells):
            continue
        rows.append(cells)
    return rows

def infer_division_from_heading(heading: str, school_slug: str) -> str:
    """Extract division/school/college name from table section heading."""
    h = heading.strip("#").strip()
    # Remove leading table number like "表 2-A："
    h = re.sub(r'^表\s*\d+-[A-Z]：\s*', '', h)
    # Remove trailing counts like "— 20 个 Concentration"
    h = re.sub(r'\s*[—–-]\s*\d+.*$', '', h)
    # Remove trailing "— Major" etc
    h = re.sub(r'\s*[—–-]\s*(主要\s*|热门\s*|部分\s*)?(Major|Concentration|Option|本科\s*Major).*$', '', h, flags=re.IGNORECASE)
    # Remove trailing " — 部分 Major" etc that might remain
    h = re.sub(r'\s*[—–-]\s*部分.*$', '', h)
    # Remove trailing Chinese parens with counts
    h = re.sub(r'（[^）]*）$', '', h)
    return h.strip() if h.strip() else "General"

def parse_school(school_slug: str) -> list[dict]:
    path = SCHOOLS_DIR / school_slug / "academic-data.md"
    if not path.exists():
        return []
    
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    records = []
    school_name = SCHOOL_DISPLAY.get(school_slug, school_slug.title())
    original_label = ORIGINAL_LABELS.get(school_slug, "major")
    source_page = f"#/schools/{school_slug}/academic-data"
    
    # Find Section 2 start
    sec2_start = None
    sec3_start = None
    for i, line in enumerate(lines):
        if re.match(r'^##\s+Section\s+2', line):
            sec2_start = i
        elif re.match(r'^##\s+Section\s+3', line):
            sec3_start = i
            break
    
    if sec2_start is None:
        return []
    
    end = sec3_start if sec3_start else len(lines)
    section2 = lines[sec2_start:end]
    
    # Split into subsections by ### headings
    subsections = []
    current_heading = "General"
    current_lines = []
    
    for line in section2:
        if line.startswith("### "):
            if current_lines:
                subsections.append((current_heading, current_lines))
            current_heading = line
            current_lines = []
        else:
            current_lines.append(line)
    if current_lines:
        subsections.append((current_heading, current_lines))
    
    for heading, sub_lines in subsections:
        division = infer_division_from_heading(heading, school_slug)
        
        # Parse table rows
        table_lines = [l for l in sub_lines if l.strip().startswith("|")]
        if not table_lines:
            continue
        
        rows = parse_table_rows(table_lines)
        if len(rows) < 2:  # need header + at least 1 data row
            continue
        
        header = [h.lower().strip() for h in rows[0]]
        
        # Determine column indices
        name_idx = None
        degree_idx = None
        div_col_idx = None  # some tables have division/school/department column
        
        for i, h in enumerate(header):
            hl = h.lower()
            if any(k in hl for k in ['major', 'concentration', 'option', 'course #']):
                if name_idx is None:
                    name_idx = i
            if 'major' in hl and name_idx is not None and i != name_idx:
                pass  # skip duplicate
            if name_idx is None and i == 0:
                name_idx = i  # fallback: first column
            if any(k in hl for k in ['学位', 'degree']):
                degree_idx = i
            if any(k in hl for k in ['division']):
                div_col_idx = i
            # Only use 学院 column for division if it's actually a school/college column, not dept abbreviation
            if '学院' in hl and school_slug not in ('mit',):
                div_col_idx = i
        
        # For MIT, course # is col 0 and major name is col 1
        if school_slug == "mit" and len(header) >= 2:
            if 'course' in header[0].lower():
                name_idx = 1
                div_col_idx = None  # use section heading as division, not dept abbreviation
                degree_idx = None  # MIT tables don't always have degree column in section 2
        
        if name_idx is None:
            name_idx = 0
        
        for row in rows[1:]:
            if len(row) <= name_idx:
                continue
            
            program_name = clean(row[name_idx])
            if not program_name or program_name.startswith("小计") or program_name.startswith("**小计"):
                continue
            # Skip if this looks like a header row that slipped through
            if program_name.lower() in ('major', 'concentration', 'option', 'course #'):
                continue
            
            degree = ""
            if degree_idx is not None and degree_idx < len(row):
                degree = clean(row[degree_idx])
            
            # For MIT, all undergrad are S.B.
            if school_slug == "mit" and not degree:
                degree = "S.B."
            
            row_division = division
            if div_col_idx is not None and div_col_idx < len(row):
                d = clean(row[div_col_idx])
                if d:
                    row_division = d
            
            # Discipline area from heading context
            discipline_area = ""
            heading_lower = heading.lower()
            if "engineering" in heading_lower or "seas" in heading_lower or "eas" in heading_lower:
                discipline_area = "Engineering"
            elif "humanities" in heading_lower or "arts" in heading_lower or "人文" in heading_lower:
                discipline_area = "Humanities"
            elif "science" in heading_lower and "social" in heading_lower or "社科" in heading_lower or "social" in heading_lower:
                discipline_area = "Social Sciences"
            elif "science" in heading_lower or "理科" in heading_lower or "physical" in heading_lower or "natural" in heading_lower:
                discipline_area = "Sciences"
            elif "biological" in heading_lower or "biology" in heading_lower:
                discipline_area = "Biological Sciences"
            elif "sloan" in heading_lower or "management" in heading_lower or "business" in heading_lower:
                discipline_area = "Business/Management"
            elif "computing" in heading_lower or "computer" in heading_lower:
                discipline_area = "Computing"
            elif "architecture" in heading_lower or "design" in heading_lower:
                discipline_area = "Architecture/Design"
            elif "sustainability" in heading_lower or "environment" in heading_lower:
                discipline_area = "Environmental/Sustainability"
            
            # For Stanford/Caltech tables with "分类" column
            for ci, h in enumerate(header):
                if '分类' in h or 'category' in h.lower():
                    if ci < len(row) and clean(row[ci]):
                        discipline_area = clean(row[ci])
            
            # Handle multiple degrees like "B.S./B.A."
            degrees = [d.strip() for d in re.split(r'[/,]', degree)] if degree else [""]
            
            for deg in degrees:
                records.append({
                    "school": school_name,
                    "school_slug": school_slug,
                    "program_name": program_name,
                    "original_label": original_label,
                    "division": row_division,
                    "degree": deg if deg else "",
                    "degree_category": normalize_degree_category(deg) if deg else "Unknown",
                    "discipline_area": discipline_area,
                    "undergrad_open": True,
                    "source_page": source_page,
                })
    
    return records

def main():
    all_records = []
    coverage = []
    school_dirs = sorted([d.name for d in SCHOOLS_DIR.iterdir() if d.is_dir() and (d / "academic-data.md").exists()])
    
    for slug in school_dirs:
        recs = parse_school(slug)
        all_records.extend(recs)
        coverage.append({
            "school_slug": slug,
            "school": SCHOOL_DISPLAY.get(slug, slug.title()),
            "status": "records_available" if recs else "no_records",
            "record_count": len(recs),
            "source_page": f"#/schools/{slug}/academic-data",
        })
        print(f"  {slug}: {len(recs)} programs", file=sys.stderr)
    
    # Deduplicate (same school + program_name + degree)
    seen = set()
    deduped = []
    for r in all_records:
        key = (r["school_slug"], r["program_name"], r["degree"])
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    
    payload = {
        "schema_version": "1.0.0",
        "dataset": "academic-programs-explorer",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_from": [f"wiki/schools/{slug}/academic-data.md" for slug in school_dirs],
        "coverage": coverage,
        "records": deduped,
    }
    
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {len(deduped)} programs to {OUT}", file=sys.stderr)

if __name__ == "__main__":
    main()
