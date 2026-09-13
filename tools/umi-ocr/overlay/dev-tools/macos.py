#!/usr/bin/env python3
"""Prepare local macOS runtimes and create a Finder launcher (not a standalone app)."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import plistlib
import shlex
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = Path.home()/'Library/Application Support/Sumi-OCR'
sys.path.insert(0, str(ROOT/'UmiOCR-data/plugins'))
from sumi_rapidocr.bundle import read_bundle
from sumi_rapidocr.package import import_bundle


def digest(path):
    sha = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            sha.update(chunk)
    return sha.hexdigest()


def native_arch():
    if sys.platform != 'darwin':
        raise RuntimeError('此命令需要在 macOS 上执行。')
    version = platform.mac_ver()[0]
    if not version or int(version.split('.')[0]) < 13:
        raise RuntimeError('固定的 ONNX Runtime Mac 包要求 macOS 13 或以上。')
    result = subprocess.run(['/usr/sbin/sysctl', '-n', 'hw.optional.arm64'],
                            capture_output=True, text=True, check=False)
    return 'arm64' if result.stdout.strip() == '1' else 'x86_64'


def python_command(python, arch):
    # absolute(), not resolve(): resolving a venv's python symlink loses the venv.
    path = Path(python).expanduser().absolute()
    if not path.is_file():
        raise ValueError('Python 不存在：' + str(path))
    if arch not in ('x86_64', 'arm64'):
        raise ValueError('无效的 Python 架构。')
    return ['/usr/bin/arch', '-'+arch, str(path)]


def check_python(python, arch, minor):
    command = python_command(python, arch)
    code = 'import json,platform,sys;print(json.dumps([sys.version_info[:2],platform.machine()]))'
    result = subprocess.run(command+['-c', code], capture_output=True, text=True, check=True)
    if json.loads(result.stdout) != [[3,minor], arch]:
        raise ValueError('需要 Python 3.%s %s：%s' % (minor, arch, python))
    return command


def wheel_inventory(root):
    files = {}
    for group in ('gui', 'engine'):
        wheels = sorted((root/group).glob('*.whl'))
        if not wheels:
            raise ValueError('依赖 wheelhouse 不完整：' + group)
        for wheel in wheels:
            if wheel.is_symlink():
                raise ValueError('依赖包不能是符号链接。')
            files[wheel.relative_to(root).as_posix()] = digest(wheel)
    return files


def verify_wheelhouse(root, arch):
    manifest = json.loads((root/'wheelhouse.json').read_text(encoding='utf-8'))
    if manifest.get('schema_version') != 1 or manifest.get('engine_arch') != arch:
        raise ValueError('wheelhouse 与此 Mac 的架构不匹配。')
    if manifest.get('files') != wheel_inventory(root):
        raise ValueError('离线依赖包缺失、被修改或包含未记录的 wheel。')
    expected = {name:digest(ROOT/'dev-tools'/name) for name in
                ('requirements-macos-gui.txt','requirements-macos-engine.txt','requirements-sumi-engine.txt')}
    if manifest.get('requirements') != expected:
        raise ValueError('离线依赖包与此版本的 requirements 不匹配，请重新准备。')
    return manifest


def prepare(args):
    arch = native_arch()
    commands = {'gui':check_python(args.gui_python,'x86_64',10),
                'engine':check_python(args.engine_python,arch,12)}
    output = args.output.expanduser().absolute()
    output.mkdir(parents=True, exist_ok=False)
    with tempfile.TemporaryDirectory(prefix='sumi-wheel-build-') as temporary:
        for group, command in commands.items():
            target = output/group
            target.mkdir()
            # Do not require pip in, or modify, the user's base Python installation.
            environment = Path(temporary)/group
            subprocess.run(command+['-m','venv',str(environment)],check=True)
            wheel_python = python_command(environment/'bin/python','x86_64' if group=='gui' else arch)
            # Explicit online preparation. Build antlr's pure-Python wheel here too.
            subprocess.run(wheel_python+['-m','pip','wheel','--wheel-dir',str(target),
                '-r',str(ROOT/'dev-tools'/('requirements-macos-'+group+'.txt'))], check=True)
    manifest = {'schema_version':1,'platform':platform.platform(),'engine_arch':arch,
        'requirements':{name:digest(ROOT/'dev-tools'/name) for name in
            ('requirements-macos-gui.txt','requirements-macos-engine.txt','requirements-sumi-engine.txt')},
        'files':wheel_inventory(output)}
    (output/'wheelhouse.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('离线依赖已准备：' + str(output))


def write_json(path, value):
    temporary = path.with_name(path.name+'.tmp')
    with temporary.open('x',encoding='utf-8') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')
    temporary.replace(path)


def setup(args):
    arch = native_arch()
    commands = {'gui':check_python(args.gui_python,'x86_64',10),
                'engine':check_python(args.engine_python,arch,12)}
    wheelhouse = args.wheelhouse.expanduser().absolute()
    manifest = verify_wheelhouse(wheelhouse, arch)
    os.environ['PIP_DISABLE_PIP_VERSION_CHECK'] = '1'
    data = args.data_dir.expanduser().absolute()
    config_path = data/'macos-launch.json'
    if config_path.exists() or (data/'runtime').exists():
        raise ValueError('此目录已有运行环境；请使用 --data-dir 指定新的目录进行安装。')
    # Validate the supplied archive/directory before any installation.
    bundle = args.bundle.expanduser().absolute()
    data.mkdir(parents=True, exist_ok=True)
    if bundle.is_dir():
        bundle = bundle/'bundle.json'
    if bundle.suffix in ('.sumimodel','.zip'):
        bundle = Path(import_bundle(bundle, data/'models'))
    else:
        read_bundle(bundle)
    runtimes = {}
    for group, command in commands.items():
        environment = data/'runtime'/group
        subprocess.run(command+['-m','venv',str(environment)],check=True)
        python = environment/'bin/python'
        command = python_command(python, 'x86_64' if group == 'gui' else arch)
        subprocess.run(command+['-m','pip','install','--no-index','--only-binary=:all:',
            '--find-links',str(wheelhouse/group),'-r',str(ROOT/'dev-tools'/('requirements-macos-'+group+'.txt'))],check=True)
        subprocess.run(command+['-m','pip','check'],check=True)
        runtimes[group] = str(python)
    launcher = data/'Sumi-OCR.command'
    config = {'schema_version':1, 'gui_python':runtimes['gui'], 'engine_python':runtimes['engine'],
        'engine_arch':arch, 'bundle_manifest':str(bundle), 'data_dir':str(data), 'source':str(ROOT),
        'launcher':str(launcher), 'wheelhouse_manifest_sha256':digest(wheelhouse/'wheelhouse.json')}
    write_json(config_path, config)
    write_launcher(launcher, config_path, config)
    write_json(data/'installed-wheels.json', manifest)
    print('离线安装完成。双击：' + str(launcher))


def write_launcher(path, config_path, config):
    command = ['/usr/bin/arch','-x86_64', config['gui_python'],
               str(Path(config['source'])/'UmiOCR-data/main_macos.py'), '--config',str(config_path)]
    # shlex.quote handles spaces, CJK, quotes, $(), and backticks literally.
    path.write_text('#!/bin/sh\nexec '+shlex.join(command)+' "$@"\n',encoding='utf-8')
    path.chmod(0o755)


def build_app(output, config_path, config):
    if output.suffix != '.app':
        raise ValueError('输出路径必须以 .app 结尾。')
    output.mkdir(parents=True, exist_ok=False)
    contents = output/'Contents'
    (contents/'MacOS').mkdir(parents=True)
    (contents/'Resources').mkdir()
    write_launcher(contents/'MacOS/Sumi-OCR', config_path, config)
    info = {'CFBundleName':'Sumi-OCR','CFBundleDisplayName':'Sumi-OCR',
        'CFBundleIdentifier':'org.sumiocr.desktop.preview','CFBundleExecutable':'Sumi-OCR',
        'CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.1.0','CFBundleVersion':'3',
        'LSMinimumSystemVersion':'13.0','NSHighResolutionCapable':True,
        'NSHumanReadableCopyright':'Sumi-OCR contributors; based on Umi-OCR © hiroi-sora (MIT)'}
    with (contents/'Info.plist').open('wb') as stream:
        plistlib.dump(info,stream)
    (contents/'Resources/README.txt').write_text(
        '本地启动器，依赖 macos-launch.json 中记录的源码与两个 Python 环境。\n'
        '不是自包含、签名或公证的安装包。请勿移动或删除源码/运行环境。\n',encoding='utf-8')


def app(args):
    native_arch()
    path = args.data_dir.expanduser().absolute()/'macos-launch.json'
    config = json.loads(path.read_text(encoding='utf-8'))
    output = args.output.expanduser().absolute()
    build_app(output,path,config)
    config['launcher'] = str(output)
    write_json(path,config)
    print('Finder 启动器：' + str(output))


def doctor(args):
    arch = native_arch()
    data = args.data_dir.expanduser().absolute()
    config = json.loads((data/'macos-launch.json').read_text(encoding='utf-8'))
    if config['engine_arch'] != arch:
        raise ValueError('配置中的 OCR 架构与本机不同，请重新安装。')
    command = check_python(config['gui_python'],'x86_64',10)
    subprocess.run(command+['-c','import PySide2, fitz, psutil, PIL; print("Qt dependencies OK")'],check=True)
    check_python(config['engine_python'],arch,12)
    read_bundle(config['bundle_manifest'])
    os.environ['SUMI_ENGINE_ARCH'] = arch
    from sumi_rapidocr.client import Api
    api = Api({'python_executable':config['engine_python'],
               'bundle_manifest':config['bundle_manifest'],'kernel_offline':args.offline})
    try:
        message = api.start({})
        if message.startswith('[Error]'):
            raise RuntimeError(message)
        report = {'platform':platform.platform(),'gui_architecture':'x86_64',
                  'engine':api.engineInfo,'gui_display_tested':False,'passed':True}
        if api.engineInfo['architecture'] != arch:
            raise RuntimeError('OCR 进程未按预期架构运行。')
        if args.image:
            report['result'] = api.runPath(str(args.image.expanduser().absolute()))
            if report['result']['code'] != 100:
                raise RuntimeError(str(report['result']))
        if args.output:
            with args.output.open('x',encoding='utf-8') as stream:
                json.dump(report,stream,ensure_ascii=False,indent=2)
        print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:
        api.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='action',required=True)
    for action in ('prepare','setup','app','doctor'):
        command = sub.add_parser(action)
        if action in ('prepare','setup'):
            command.add_argument('--gui-python',required=True)
            command.add_argument('--engine-python',required=True)
        if action != 'prepare':
            command.add_argument('--data-dir',type=Path,default=DEFAULT_DATA)
        if action in ('prepare','app'):
            command.add_argument('--output',type=Path,required=True)
        if action == 'prepare':
            command.add_argument('--download',action='store_true',required=True,
                                 help='明确允许联网准备依赖；不会安装 Rosetta 或 Python。')
        if action == 'setup':
            command.add_argument('--wheelhouse',type=Path,required=True)
            command.add_argument('--bundle',type=Path,required=True)
        if action == 'doctor':
            command.add_argument('--offline',action='store_true',help='使用系统网络沙箱并验证，失败不降级')
            command.add_argument('--image',type=Path)
            command.add_argument('--output',type=Path)
    args = parser.parse_args()
    try:
        globals()[args.action](args)
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as exc:
        parser.exit(1, 'Mac 配置失败：'+str(exc)+'\n')


if __name__ == '__main__':
    main()
