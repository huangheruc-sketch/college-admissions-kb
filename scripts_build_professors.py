#!/usr/bin/env python3
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

BASE = Path(__file__).resolve().parent
RESEARCH_DIR = BASE / 'data' / 'research'
OUTPUT_PATH = BASE / 'data' / 'explorers' / 'professors.json'

SCHOOL_LABELS = {
    'caltech': 'Caltech',
    'columbia': 'Columbia',
    'cornell': 'Cornell',
    'harvard': 'Harvard',
    'mit': 'MIT',
    'princeton': 'Princeton',
    'stanford': 'Stanford',
    'uc-berkeley': 'UC Berkeley',
    'uchicago': 'UChicago',
    'ucla': 'UCLA',
    'yale': 'Yale',
}

STATUS_KEYWORDS = [
    ('emeritus', 'Emeritus'),
    ('emerita', 'Emeritus'),
    ('assistant professor', 'Assistant Professor'),
    ('associate professor', 'Associate Professor'),
    ('visiting professor', 'Visiting Professor'),
    ('visiting associate professor', 'Visiting Professor'),
    ('visiting assistant professor', 'Visiting Professor'),
    ('professor', 'Professor'),
    ('lecturer', 'Lecturer'),
    ('instructor', 'Instructor'),
]


def iso_now_shanghai() -> str:
    tz = timezone(timedelta(hours=8))
    return datetime.now(tz).replace(microsecond=0).isoformat()


def infer_status(title: str) -> str:
    title_lower = (title or '').strip().lower()
    for needle, status in STATUS_KEYWORDS:
        if needle in title_lower:
            return status
    return 'Unknown'


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def build_record(school_slug: str, entry: dict) -> dict:
    title = clean_text(entry.get('roster_title'))
    research = clean_text(entry.get('primary_research_areas'))
    return {
        'record_id': f"{school_slug}:{clean_text(entry.get('name')) or 'unknown'}:{clean_text(entry.get('department')) or 'unknown'}",
        'school_slug': school_slug,
        'school': SCHOOL_LABELS.get(school_slug, school_slug.replace('-', ' ').title()),
        'department': clean_text(entry.get('department')) or '',
        'name': clean_text(entry.get('name')) or '',
        'title': title or '',
        'roster_title': title or '',
        'status': infer_status(title),
        'research_areas': research or '',
        'primary_research_areas': research or '',
        'research_available': bool(research),
        'education_history': clean_text(entry.get('education_history')) or '',
        'work_professional_background': clean_text(entry.get('work_professional_background')) or '',
        'faculty_source_url': clean_text(entry.get('faculty_source_url')) or '',
        'roster_url': clean_text(entry.get('roster_url')) or '',
        'school_page_path': f"#/schools/{school_slug}/professors",
    }


def main():
    records = []
    coverage = []
    generated_from = []

    for path in sorted(RESEARCH_DIR.glob('*faculty*.json')):
        school_slug = path.name.split('_faculty_', 1)[0]
        if school_slug not in SCHOOL_LABELS:
            continue
        payload = json.loads(path.read_text(encoding='utf-8'))
        entries = payload.get('entries') or []
        school_records = [build_record(school_slug, entry) for entry in entries if clean_text(entry.get('name'))]
        school_records.sort(key=lambda item: ((item['department'] or '').lower(), item['name'].lower()))
        records.extend(school_records)
        coverage.append({
            'school_slug': school_slug,
            'school': SCHOOL_LABELS[school_slug],
            'status': 'records_available' if school_records else 'page_exists_no_data',
            'record_count': len(school_records),
            'source_data': f"data/research/{path.name}",
            'source_page': f"#/schools/{school_slug}/professors",
        })
        generated_from.append(f"data/research/{path.name}")

    records.sort(key=lambda item: (item['school'].lower(), item['department'].lower(), item['name'].lower()))

    payload = {
        'schema_version': '1.1.0',
        'dataset': 'professors-explorer',
        'generated_at': iso_now_shanghai(),
        'generated_from': generated_from,
        'coverage': {
            'schools': len(coverage),
            'total_in_source': len(records),
            'captured_structured': len(records),
            'departments': sorted({item['department'] for item in records if item['department']}),
            'note': 'Built from all available school-level faculty JSON files under data/research/*faculty*.json.',
            'per_school': coverage,
        },
        'fields': [
            'record_id', 'school_slug', 'school', 'department', 'name', 'title', 'status', 'research_areas',
            'research_available', 'education_history', 'work_professional_background', 'faculty_source_url',
            'roster_url', 'school_page_path'
        ],
        'filterable_fields': ['school', 'department', 'status', 'research_available'],
        'records': records,
    }

    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Schools: {len(coverage)}")
    print(f"Records: {len(records)}")


if __name__ == '__main__':
    main()
