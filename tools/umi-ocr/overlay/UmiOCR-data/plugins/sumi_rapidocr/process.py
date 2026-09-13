"""Architecture and environment isolation for the external engine."""
import os
import platform
from pathlib import Path
import sys

MAC_NETWORK_PROFILE = '(version 1) (allow default) (deny network*)'


def worker_command(python, bundle, detail=False, kernel_offline=False):
    command = [str(python), '-u', str(Path(__file__).with_name('worker.py')),
               '--bundle', str(bundle)]
    if detail:
        command.append('--detail')
    if kernel_offline:
        command.append('--kernel-offline')
    if sys.platform == 'darwin':
        arch = os.environ.get('SUMI_ENGINE_ARCH', platform.machine())
        if arch not in ('arm64', 'x86_64'):
            raise ValueError('Unsupported macOS OCR architecture: ' + arch)
        command = ['/usr/bin/arch', '-' + arch] + command
        if kernel_offline:
            command = ['/usr/bin/sandbox-exec', '-p', MAC_NETWORK_PROFILE] + command
    return command


def worker_environment():
    env = os.environ.copy()
    # Do not load the GUI's Qt plugins or Python site-packages into OpenCV/ORT.
    for key in ('PYTHONHOME', 'PYTHONPATH', 'QT_PLUGIN_PATH', 'QT_QPA_PLATFORM_PLUGIN_PATH',
                'QML2_IMPORT_PATH', 'QML_IMPORT_PATH', 'DYLD_LIBRARY_PATH',
                'DYLD_FRAMEWORK_PATH'):
        env.pop(key, None)
    env['PYTHONNOUSERSITE'] = '1'
    return env
