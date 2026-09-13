#!/usr/bin/env python3
"""Reconstruct the enhanced source in a NEW directory from a pinned upstream.

No dependency installation, OCR inference, service startup or publishing.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def validated_overlay(manifest):
    if manifest.get('schema_version') != 1:
        raise ValueError('Unsupported source manifest schema')
    entries = []
    seen = set()
    for item in manifest['overlay']:
        relative = PurePosixPath(item['path'])
        if (relative.is_absolute() or not relative.parts or '..' in relative.parts
                or any(part.lower() == '.git' for part in relative.parts)
                or '\\' in item['path'] or ':' in item['path'] or item['path'] in seen):
            raise ValueError('Invalid overlay path: ' + item['path'])
        seen.add(item['path'])
        source = (ROOT/'overlay'/relative).resolve()
        source.relative_to((ROOT/'overlay').resolve())
        content = source.read_bytes()
        if hashlib.sha256(content).hexdigest() != item['sha256']:
            raise ValueError('Overlay checksum mismatch: ' + item['path'])
        entries.append((relative, content))
    return entries


def git(destination, *arguments):
    return subprocess.run(['git', '-C', str(destination), *arguments], check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True).stdout.strip()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path, help='New, nonexistent source directory')
    parser.add_argument('--local-source', type=Path, help='Existing upstream Git clone for offline reproduction')
    args = parser.parse_args(argv)
    destination = args.destination.absolute()
    try:
        manifest = json.loads((ROOT/'SOURCE.json').read_text(encoding='utf-8'))
        entries = validated_overlay(manifest)
        if not shutil.which('git'):
            raise ValueError('Git must be installed')
        revision = manifest['upstream_commit']
        if len(revision) != 40 or any(c not in '0123456789abcdef' for c in revision):
            raise ValueError('Invalid pinned upstream commit')
        if args.local_source:
            source = args.local_source.resolve()
            git(source, 'cat-file', '-e', revision + '^{commit}')
            fetch_source = str(source)
        else:
            fetch_source = manifest['upstream_url']
        # Exclusive creation: never alter an existing working copy.
        destination.mkdir(parents=True, exist_ok=False)
        git(destination, 'init')
        git(destination, 'remote', 'add', 'origin', manifest['upstream_url'])
        git(destination, 'fetch', '--depth', '1', fetch_source, revision)
        git(destination, 'checkout', '--detach', 'FETCH_HEAD')
        if git(destination, 'rev-parse', 'HEAD') != revision:
            raise ValueError('Upstream commit mismatch')
        for relative, content in entries:
            target = destination/relative
            target.resolve().relative_to(destination.resolve())
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
        print('Enhanced source ready: ' + str(destination))
        print('Pinned upstream: ' + revision)
        print('Changes are uncommitted for inspection with git diff and git status.')
        print('Tests: cd "' + str(destination) + '" then python -m unittest discover -s tests -v')
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        detail = exc.stderr if isinstance(exc, subprocess.CalledProcessError) else str(exc)
        print('Reconstruction failed: ' + detail, file=sys.stderr)
        print('No existing directory is overwritten. If a new partial directory was created, inspect it and use a new destination.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
