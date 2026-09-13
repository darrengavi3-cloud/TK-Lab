"""Portable model archives, strict import, and no implicit downloads."""
import json
from pathlib import Path
import shutil
import stat
import tempfile
import uuid
import zipfile

from .bundle import read_bundle, sha256
from .client import Api


def export_bundle(manifest_path, python, destination):
    destination = Path(destination)
    if destination.exists():
        raise ValueError('Archive already exists; choose a new filename')
    manifest, profile, files = read_bundle(manifest_path)
    api = Api({'python_executable':str(python),'bundle_manifest':str(Path(manifest_path).resolve())})
    try:
        message = api.start({})
        if message.startswith('[Error]'):
            raise RuntimeError(message)
        result = api.getDictionary()
        if result['code'] != 100:
            raise RuntimeError(str(result['data']))
        dictionary = (json.dumps(result['data'],ensure_ascii=False,separators=(',',':'))+'\n').encode()
        import hashlib
        if hashlib.sha256(dictionary).hexdigest() != profile['dictionary']['sha256']:
            raise ValueError('Worker dictionary differs from the catalog')
        complete = dict(manifest, schema_version=2, dictionary_spec=profile['dictionary'],
            runtime={'backend':'rapidocr-onnxruntime-cpu','rapidocr':manifest['rapidocr_version'],
                     'onnxruntime':manifest['onnxruntime_version']})
        # Exclusive creation and streamed models: no overwrite or multi-GB buffering.
        with zipfile.ZipFile(destination,'x',compression=zipfile.ZIP_STORED) as archive:
            archive.writestr('bundle.json',json.dumps(complete,ensure_ascii=False,indent=2)+'\n')
            archive.writestr('dictionary.json',dictionary)
            for name in ('MODEL-LICENSE.txt','MODEL-NOTICE.txt'):
                archive.write(Path(__file__).with_name(name),name)
            for stage,path in files.items():
                archive.write(path,profile['models'][stage]['file'])
        return {'archive':str(destination.resolve()),'sha256':sha256(destination),
                'profile':manifest['profile'],'dictionary':profile['dictionary'],
                'runtime':complete['runtime']}
    finally:
        api.stop()


def import_bundle(archive_path, destination_parent):
    """Validate in a new temporary directory, then publish a unique local bundle."""
    parent = Path(destination_parent).resolve()
    parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.sumi-import-',dir=parent) as work:
        root = Path(work)
        with zipfile.ZipFile(archive_path) as archive:
            names = archive.namelist()
            if len(names) != len(set(names)) or 'bundle.json' not in names:
                raise ValueError('Archive has duplicate entries or no manifest')
            if archive.getinfo('bundle.json').file_size > 1024*1024:
                raise ValueError('Manifest exceeds 1 MiB')
            manifest = json.loads(archive.read('bundle.json'))
            catalog = json.loads(Path(__file__).with_name('catalog.json').read_text(encoding='utf-8'))
            if manifest.get('schema_version') != 2 or manifest.get('profile') not in catalog['profiles']:
                raise ValueError('Import requires a complete version 2 Sumi model archive')
            profile = catalog['profiles'][manifest['profile']]
            allowed = {'bundle.json','dictionary.json','MODEL-LICENSE.txt','MODEL-NOTICE.txt'} | {m['file'] for m in profile['models'].values()}
            if set(names) != allowed or sum(i.file_size for i in archive.infolist()) > 1024**3:
                raise ValueError('Unexpected archive entries or archive exceeds 1 GiB')
            for info in archive.infolist():
                if info.is_dir() or stat.S_ISLNK(info.external_attr >> 16) or info.flag_bits & 1:
                    raise ValueError('Directories, links and encrypted entries are unsupported')
                with archive.open(info) as source, (root/info.filename).open('xb') as output:
                    shutil.copyfileobj(source,output)
        read_bundle(root/'bundle.json')
        target = parent/(manifest['profile']+'-'+uuid.uuid4().hex)
        root.rename(target)
    return str(target/'bundle.json')
