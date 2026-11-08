#!/usr/bin/env python3
"""Read-only local library adapter. No network, no library writes."""
import argparse
import csv
import hashlib
import json
import pathlib
import sqlite3
import sys

def identifier(value):
    return '"' + value.replace('"', '""') + '"'

def export_rows(rows, args, columns):
    books = {}
    for index, row in enumerate(rows, 1):
        text = str(row.get(columns['text']) or '').strip()
        if not text:
            continue
        book_id = str(row.get(columns.get('book_id', '')) or args.input.stem)
        book = books.setdefault(book_id, {
            'id': book_id, 'title': str(row.get(columns.get('title', '')) or args.title or args.input.stem),
            'author': str(row.get(columns.get('author', '')) or ''),
            'edition': str(row.get(columns.get('edition', '')) or ''), 'pages': []})
        page_id = str(row.get(columns.get('page_id', '')) or index)
        if any(p['id'] == page_id for p in book['pages']):
            raise ValueError('Duplicate page id in book: ' + book_id)
        book['pages'].append({'id': page_id, 'text': text,
            'filePage': str(index), 'printedPage': str(row.get(columns.get('page', '')) or ''),
            'volume': str(row.get(columns.get('volume', '')) or ''),
            'chapter': str(row.get(columns.get('chapter', '')) or '')})
    if not books:
        raise ValueError('No nonempty text pages found')
    return {'version': 1, 'name': args.name or args.input.stem, 'books': list(books.values())}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('input', type=pathlib.Path)
    p.add_argument('--inspect', action='store_true', help='List SQLite tables and columns without changing files')
    p.add_argument('--table')
    p.add_argument('--text', default='text', help='Text column')
    for name in ['book-id', 'page-id', 'title', 'author', 'edition', 'page', 'volume', 'chapter']:
        p.add_argument('--' + name + '-column')
    p.add_argument('--title')
    p.add_argument('--name')
    p.add_argument('--encoding', default='utf-8-sig')
    p.add_argument('--output', type=pathlib.Path)
    args = p.parse_args()
    src = args.input.resolve(strict=True)
    if args.output and args.output.resolve() == src:
        p.error('Output must not overwrite the library')
    with src.open('rb') as handle:
        magic = handle.read(16)
    columns = {'text': args.text}
    for name in ['book_id', 'page_id', 'title', 'author', 'edition', 'page', 'volume', 'chapter']:
        value = getattr(args, name + '_column')
        if value:
            columns[name] = value
    if magic == b'SQLite format 3\x00':
        with sqlite3.connect(src.as_uri() + '?mode=ro', uri=True) as db:
            db.execute('PRAGMA query_only=ON')
            tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
            if args.inspect:
                print(json.dumps({t: [r[1] for r in db.execute('PRAGMA table_info(' + identifier(t) + ')')] for t in tables}, ensure_ascii=False, indent=2))
                return
            if args.table not in tables:
                p.error('Use --inspect then choose --table and text/metadata columns')
            names = [r[1] for r in db.execute('PRAGMA table_info(' + identifier(args.table) + ')')]
            if any(c not in names for c in columns.values()):
                p.error('One or more mapped columns do not exist')
            cursor = db.execute('SELECT * FROM ' + identifier(args.table))
            data = export_rows((dict(zip(names, row)) for row in cursor), args, columns)
    elif src.suffix.lower() == '.csv':
        with src.open(encoding=args.encoding, newline='') as handle:
            reader = csv.DictReader(handle)
            if any(c not in (reader.fieldnames or []) for c in columns.values()):
                p.error('One or more mapped CSV columns do not exist')
            data = export_rows(reader, args, columns)
    elif src.suffix.lower() == '.txt':
        text = src.read_text(encoding=args.encoding)
        data = export_rows(({'text': t} for t in text.split('\f')), args, {'text': 'text'})
    elif src.suffix.lower() == '.json':
        data = json.loads(src.read_text(encoding=args.encoding))
        if data.get('version') != 1 or not data.get('books'):
            p.error('Use the documented version-1 library JSON format')
    else:
        p.error('Unsupported format. Export MDB/BOK using its library software as text/CSV, or use a verified adapter. EXE is not a text database.')
    output = args.output or src.with_name(src.stem + '.mihbara.json')
    if output.exists():
        p.error('Output already exists; choose a new output filename')
    with output.open('x', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False)
    print('Exported ' + str(sum(len(b['pages']) for b in data['books'])) + ' pages to ' + str(output))

if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, sqlite3.Error) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
