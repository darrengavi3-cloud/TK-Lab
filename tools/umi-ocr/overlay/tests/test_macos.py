"""Mac contracts tested without pretending a Linux host is a physical Mac."""
import ctypes
import errno
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import shlex
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'UmiOCR-data/plugins'))
from sumi_rapidocr import process, network_guard


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT/path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mac = load('mac_setup', 'dev-tools/macos.py')
darwin = load('mac_platform', 'UmiOCR-data/py_src/platform/darwin/darwin_api.py')


class MacTests(unittest.TestCase):
    def test_native_worker_arch_survives_rosetta_parent(self):
        with patch.object(process.sys,'platform','darwin'), patch.dict(os.environ,{'SUMI_ENGINE_ARCH':'arm64'}):
            command = process.worker_command('/env with spaces/bin/python','/模型/bundle.json',True,True)
        self.assertEqual(command[:6], ['/usr/bin/sandbox-exec','-p',process.MAC_NETWORK_PROFILE,
                                      '/usr/bin/arch','-arm64','/env with spaces/bin/python'])
        self.assertIn('--detail',command)
        self.assertIn('--kernel-offline',command)

    def test_invalid_arch_fails_before_process_start(self):
        with patch.object(process.sys,'platform','darwin'), patch.dict(os.environ,{'SUMI_ENGINE_ARCH':'arm64; echo bad'}):
            with self.assertRaises(ValueError):
                process.worker_command('/python','/bundle')

    def test_worker_does_not_inherit_gui_libraries(self):
        with patch.dict(os.environ,{'PYTHONPATH':'qt-site-packages','QT_PLUGIN_PATH':'Qt/plugins',
                                    'DYLD_LIBRARY_PATH':'qt-lib','SUMI_ENGINE_ARCH':'arm64'}):
            env = process.worker_environment()
            self.assertNotIn('PYTHONPATH',env)
            self.assertNotIn('QT_PLUGIN_PATH',env)
            self.assertNotIn('DYLD_LIBRARY_PATH',env)
            self.assertEqual(env['SUMI_ENGINE_ARCH'],'arm64')
            self.assertEqual(os.environ['QT_PLUGIN_PATH'],'Qt/plugins')

    def test_launcher_quotes_unicode_and_shell_metacharacters(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            config = {'gui_python':str(root/"Python 空格'$(bad)`bad`/bin/python"),
                      'source':str(root/'源码')}
            target = root/'Sumi-OCR.command'
            mac.write_launcher(target,root/'config.json',config)
            command = shlex.split(target.read_text().splitlines()[1])
            self.assertEqual(command[3],config['gui_python'])
            self.assertEqual(command[-1],'$@')
            self.assertEqual(target.stat().st_mode & 0o777,0o755)

    def test_app_metadata_and_existing_app_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);app=root/'Sumi-OCR.app'
            config={'gui_python':'/py/bin/python','source':'/source'}
            mac.build_app(app,root/'launch.json',config)
            info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
            self.assertTrue(info['NSHighResolutionCapable'])
            self.assertEqual(info['LSMinimumSystemVersion'],'13.0')
            self.assertTrue((app/'Contents/MacOS/Sumi-OCR').is_file())
            with self.assertRaises(FileExistsError):mac.build_app(app,root/'other.json',config)
            self.assertEqual(info,plistlib.loads((app/'Contents/Info.plist').read_bytes()))

    def test_offline_wheels_reject_tampering_extras_and_wrong_arch(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            for group in ('gui','engine'):
                (root/group).mkdir();(root/group/'test.whl').write_bytes(b'test fixture')
            manifest={'schema_version':1,'engine_arch':'arm64','files':mac.wheel_inventory(root),
                'requirements':{name:mac.digest(ROOT/'dev-tools'/name) for name in
                    ('requirements-macos-gui.txt','requirements-macos-engine.txt','requirements-sumi-engine.txt')}}
            (root/'wheelhouse.json').write_text(json.dumps(manifest))
            self.assertEqual(mac.verify_wheelhouse(root,'arm64'),manifest)
            with self.assertRaises(ValueError):mac.verify_wheelhouse(root,'x86_64')
            (root/'engine/test.whl').write_bytes(b'changed')
            with self.assertRaises(ValueError):mac.verify_wheelhouse(root,'arm64')
            (root/'engine/test.whl').write_bytes(b'test fixture')
            (root/'engine/extra.whl').write_bytes(b'extra')
            with self.assertRaises(ValueError):mac.verify_wheelhouse(root,'arm64')

    def test_find_native_hardware_from_rosetta_interpreter(self):
        with patch.object(mac.sys,'platform','darwin'), patch.object(mac.platform,'mac_ver',return_value=('13.6',(),'')), \
             patch.object(mac.subprocess,'run',return_value=SimpleNamespace(stdout='1\n')):
            self.assertEqual(mac.native_arch(),'arm64')

    def test_local_open_never_invokes_shell(self):
        with patch.object(darwin.subprocess,'Popen') as popen:
            darwin.Api.startfile('/tmp/京華 %20 $(text).pdf')
            self.assertEqual(popen.call_args.args[0],['/usr/bin/open','/tmp/京華 %20 $(text).pdf'])
            darwin.Api.runNewProcess('/Applications/Sumi-OCR.app','--force')
            self.assertEqual(popen.call_args.args[0],['/usr/bin/open','-n','-a','/Applications/Sumi-OCR.app','--args','--force'])

    def test_missing_permissions_return_recovery_instructions(self):
        class Function:
            def __call__(self):return False
        framework=SimpleNamespace(AXIsProcessTrusted=Function(),CGPreflightScreenCaptureAccess=Function(),
                                  CGRequestScreenCaptureAccess=Function())
        with patch.object(darwin,'_framework',return_value=framework):
            self.assertIn('本地文件',darwin.hotkey_access())
            self.assertIn('屏幕',darwin.screen_capture_access())

    def test_modifier_keys_are_normalized_without_text_rewriting(self):
        self.assertEqual(darwin.Api.getKeyName('Key.cmd_r'),'cmd')
        self.assertEqual(darwin.Api.getKeyName(SimpleNamespace(char='X')),'x')

    def test_connection_refused_is_not_offline_sandbox_proof(self):
        class Connect:
            def __call__(self,*args):
                ctypes.set_errno(errno.ECONNREFUSED)
                return -1
        libc=SimpleNamespace(socket=lambda *args:123,connect=Connect(),close=lambda fd:None)
        with patch.object(network_guard.ctypes,'CDLL',return_value=libc):
            with self.assertRaisesRegex(RuntimeError,'proof missing'):
                network_guard.verify_macos_network_denial()

    def test_kernel_permission_denial_is_checked_for_both_families(self):
        class Connect:
            def __call__(self,*args):
                ctypes.set_errno(errno.EPERM)
                return -1
        closed=[]
        libc=SimpleNamespace(socket=lambda *args:123,connect=Connect(),close=closed.append)
        with patch.object(network_guard.ctypes,'CDLL',return_value=libc):
            report=network_guard.verify_macos_network_denial()
        self.assertTrue(report['ipv4_connect_denied'])
        self.assertTrue(report['ipv6_connect_denied'])
        self.assertEqual(closed,[123,123])


if __name__=='__main__':unittest.main()
