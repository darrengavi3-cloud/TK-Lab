#!/usr/bin/env python3
"""macOS Qt 5 entry point; no installation or model download at launch."""
import json
import os
from pathlib import Path
import platform
import site
import subprocess
import sys
import traceback


def message_box(message, type_='error'):
    print(str(message), file=sys.stderr)
    # argv carries the text; file paths/error text never become AppleScript code.
    script = ('on run argv\n display dialog (item 1 of argv) with title "Sumi-OCR" '
              'buttons {"OK"} default button "OK"\nend run')
    subprocess.run(['/usr/bin/osascript', '-e', script, str(message)], check=False)


def initialize(config_path):
    if sys.platform != 'darwin':
        raise RuntimeError('此入口仅用于 macOS；参见 docs/MACOS_ZH.md。')
    if sys.version_info[:2] != (3, 10) or platform.machine() != 'x86_64':
        raise RuntimeError('Qt 5 界面需要 Python 3.10 x86_64。请通过生成的启动器运行。')
    config = json.loads(Path(config_path).read_text(encoding='utf-8'))
    if config.get('schema_version') != 1 or config.get('engine_arch') not in ('arm64','x86_64'):
        raise ValueError('无效的 macOS 启动配置。')
    for name in ('engine_python', 'bundle_manifest'):
        if not Path(config[name]).is_file():
            raise ValueError('本地文件不存在，请重新配置：' + config[name])
    data = Path(config['data_dir']).expanduser().absolute()
    data.mkdir(parents=True, exist_ok=True)
    os.environ.update(SUMI_DATA_DIR=str(data), SUMI_ENGINE_PYTHON=config['engine_python'],
                      SUMI_MODEL_BUNDLE=config['bundle_manifest'], SUMI_ENGINE_ARCH=config['engine_arch'])
    os.environ.setdefault('QT_MAC_WANTS_LAYER', '1')
    os.environ['PYTHONNOUSERSITE'] = '1'
    os.MessageBox = message_box
    source = Path(__file__).resolve().parent
    os.chdir(source)
    site.addsitedir(str(source))
    return config


def main():
    try:
        args = sys.argv[1:]
        if len(args) < 2 or args[0] != '--config':
            raise ValueError('请使用 macos.py setup/app 生成的启动器。')
        config = initialize(args[1])
        sys.argv = [sys.argv[0]] + [arg for arg in args[2:] if not arg.startswith('-psn_')]
        from py_src.run import main as run
        run(app_path=config['launcher'])
    except Exception:
        message_box(traceback.format_exc())
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
