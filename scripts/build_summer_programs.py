#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from lxml import html

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / 'wiki/data/explorers/summer-programs.json'
OUT_MD = ROOT / 'raw/anndave-portal/2026-04-11/db-summer-programs-full-table.md'
BASE_URL = 'https://portal.anndaveconsulting.com/dashboard/database/summer-programs/list?majorParents=&page={page}&pageSize=25'
TOTAL_PAGES = 14
TOTAL_IN_SOURCE = 330


def fetch_page(page: int, jwt: str) -> str:
    req = urllib.request.Request(
        BASE_URL.format(page=page),
        headers={'Cookie': f'jwt={jwt}', 'User-Agent': 'Mozilla/5.0'},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', 'ignore')


def text_content(node) -> str:
    return ' '.join(t.strip() for t in node.xpath('.//text()') if t.strip()).strip()


def normalize_grade(raw: str) -> tuple[str, int | None]:
    raw = raw.strip()
    m = re.search(r'(\d+)(st|nd|rd|th)\s*Grade\+', raw, re.I)
    if m:
        return f'{m.group(1)}{m.group(2).lower()}+', int(m.group(1))
    return raw.replace(' Grade+', '+').strip(), None


def infer_format(location: str) -> str:
    lower = location.lower()
    has_online = any(x in lower for x in ['online', 'virtual', 'remote'])
    has_place = any(x in lower for x in [',', 'campus', 'university', 'college', 'school', 'various', 'varies', 'locations'])
    if has_online and has_place:
        return 'Hybrid'
    if has_online:
        return 'Online'
    return 'In-Person'


def infer_state(location: str) -> str:
    m = re.search(r',\s*([A-Z]{2})(?:\b|\s*\))', location)
    return m.group(1) if m else ''


def clean_dash(value: str) -> str:
    value = value.strip()
    return '' if value in {'-', '—', '-2'} else value


def parse_records(jwt: str) -> list[dict]:
    records = []
    for page in range(1, TOTAL_PAGES + 1):
        doc = html.fromstring(fetch_page(page, jwt))
        for tr in doc.xpath('//table//tbody//tr'):
            cells = [text_content(td) for td in tr.xpath('./td')]
            if len(cells) < 7 or not any(cells):
                continue
            grade, grade_min = normalize_grade(cells[4])
            location = cells[1].strip()
            profile_path = ''
            link = tr.xpath('./td[1]//a/@href')
            if link:
                profile_path = link[0].strip()
            record = {
                'name': cells[0].strip(),
                'location': location,
                'deadline': clean_dash(cells[2]),
                'rec_letters': int(cells[3]) if cells[3].strip().isdigit() else cells[3].strip(),
                'grade': grade,
                'updated_for': clean_dash(cells[6]),
                'format': infer_format(location),
                'state': infer_state(location),
                'grade_min': grade_min,
                'adc_tier': None,
                'adc_detail_path': profile_path,
                'adc_detail_url': f'https://portal.anndaveconsulting.com{profile_path}' if profile_path else '',
            }
            records.append(record)
    return records


def write_markdown(records: list[dict]) -> None:
    lines = [
        '# Database: Summer Programs (Structured full table)',
        '',
        '- **Module:** Databases > Summer Programs',
        '- **URL:** https://portal.anndaveconsulting.com/dashboard/database/summer-programs/list',
        f'- **Fetched:** {datetime.now().strftime("%Y-%m-%d %H:%M CST")}',
        f'- **Total:** {len(records)} Summer Programs',
        '- **Columns:** Summer Program | Location | Deadline | # Rec Letters | Grade Req\'ts | ADC Tier | Updated For',
        '',
        '| # | Summer Program | Location | Deadline | Rec Letters | Grade | ADC Tier | Updated |',
        '|---|---|---|---|---|---|---|---|',
    ]
    for i, r in enumerate(records, 1):
        vals = [str(i), r['name'], r['location'], r['deadline'] or '-', str(r['rec_letters']), r['grade'] or '-', r.get('adc_tier', '-') or '-', r['updated_for'] or '-']
        vals = [v.replace('|', '/').replace('\n', ' ').strip() for v in vals]
        lines.append('| ' + ' | '.join(vals) + ' |')
    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main() -> None:
    jwt = os.environ.get('ADC_PORTAL_JWT', '').strip()
    if not jwt:
        raise SystemExit('Missing ADC_PORTAL_JWT')
    records = parse_records(jwt)
    if len(records) != TOTAL_IN_SOURCE:
        raise SystemExit(f'Expected {TOTAL_IN_SOURCE} records, got {len(records)}')
    payload = {
        'schema_version': 3,
        'dataset': 'summer-programs-explorer',
        'generated_at': datetime.now(UTC).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'generated_from': [
            'portal.anndaveconsulting.com/dashboard/database/summer-programs/list',
            'raw/anndave-portal/2026-04-11/db-summer-programs-full-table.md',
        ],
        'coverage': {
            'total_in_source': TOTAL_IN_SOURCE,
            'captured_structured': len(records),
            'adc_detail_links_captured': sum(1 for r in records if r.get('adc_detail_url')),
            'adc_tier_non_empty': 0,
            'adc_tier_empty_or_missing': len(records),
            'adc_tier_note': 'Base build captures detail links from the list page. ADC Tier should be backfilled from portal profile pages when available.',
            'note': 'Full Summer Programs table was captured from the logged-in portal session on 2026-04-11, with detail links extracted from the list page.',
        },
        'fields': ['name', 'location', 'state', 'deadline', 'rec_letters', 'grade', 'grade_min', 'format', 'updated_for', 'adc_tier', 'adc_detail_path', 'adc_detail_url'],
        'filterable_fields': ['grade', 'format', 'rec_letters', 'state', 'updated_for', 'deadline', 'adc_tier'],
        'records': records,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_markdown(records)
    print(f'wrote {len(records)} records to {OUT_JSON}')


if __name__ == '__main__':
    main()
