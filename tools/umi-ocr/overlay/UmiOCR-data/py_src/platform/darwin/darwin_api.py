"""macOS services. Importing this module never requests OS permissions."""
import ctypes
from pathlib import Path
import shlex
import subprocess


def _framework(name):
    return ctypes.CDLL('/System/Library/Frameworks/{0}.framework/{0}'.format(name))


def hotkey_access():
    try:
        function = _framework('ApplicationServices').AXIsProcessTrusted
        function.restype = ctypes.c_bool
        function.argtypes = []
        if function():
            return ''
    except (OSError, AttributeError):
        pass
    return ('[Warning] macOS 全局快捷键尚未获授权。请在系统设置 → 隐私与安全性 → '
            '辅助功能 / 输入监控中允许当前启动程序，然后重启 Sumi-OCR。'
            '仍可点击按钮和打开本地文件识别。')


def screen_capture_access():
    try:
        library = _framework('CoreGraphics')
        for name in ('CGPreflightScreenCaptureAccess', 'CGRequestScreenCaptureAccess'):
            function = getattr(library, name)
            function.restype = ctypes.c_bool
            function.argtypes = []
        if library.CGPreflightScreenCaptureAccess():
            return ''
        # Called only by the user's Screenshot action, never at startup.
        if library.CGRequestScreenCaptureAccess():
            return ''
        return ('[Error] macOS 尚未允许屏幕录制。请在系统设置 → 隐私与安全性 → '
                '屏幕与系统音频录制中允许当前启动程序，然后重启。'
                '也可使用系统截图后粘贴图片，或打开本地文件识别。')
    except (OSError, AttributeError) as exc:
        return '[Error] 无法检查 macOS 屏幕录制权限：' + str(exc)


class _Shortcut:
    @staticmethod
    def _paths(position):
        from umi_about import UmiAbout
        app = Path(UmiAbout['app']['path'])
        if app.suffix != '.app' or not app.is_dir():
            raise ValueError('请先运行 dev-tools/macos.py app 创建 Sumi-OCR.app。')
        folder = {'desktop': 'Desktop', 'startMenu': 'Applications'}.get(position)
        if not folder:
            raise ValueError('请在系统设置 → 通用 → 登录项中手动添加 Sumi-OCR.app。')
        return app, Path.home()/folder/'Sumi-OCR.app'

    @classmethod
    def createShortcut(cls, position):
        try:
            app, link = cls._paths(position)
            if link.resolve() == app.resolve():
                return '[Success]'
            if link.exists() or link.is_symlink():
                raise ValueError('目标已存在，请手动处理：' + str(link))
            link.parent.mkdir(parents=True, exist_ok=True)
            link.symlink_to(app, target_is_directory=True)
            return '[Success]'
        except (OSError, ValueError) as exc:
            return '[Warning] ' + str(exc)

    @classmethod
    def deleteShortcut(cls, position):
        try:
            app, link = cls._paths(position)
            if link.is_symlink() and link.resolve() == app.resolve():
                link.unlink()
                return 1
        except (OSError, ValueError):
            pass
        return 0


class _HardwareCtrl:
    @staticmethod
    def shutdown():
        subprocess.Popen(['/usr/bin/osascript', '-e', 'tell application "System Events" to shut down'])

    @staticmethod
    def hibernate():
        subprocess.Popen(['/usr/bin/osascript', '-e', 'tell application "System Events" to sleep'])


class Api:
    Shortcut = _Shortcut()
    HardwareCtrl = _HardwareCtrl()
    hotkeyAccess = staticmethod(hotkey_access)
    screenCaptureAccess = staticmethod(screen_capture_access)

    @staticmethod
    def getOpenGLUse():
        return 'AA_UseDesktopOpenGL'

    @staticmethod
    def getKeyName(key):
        value = getattr(key, 'char', None)
        if value is not None:
            return value.lower()
        value = str(key).removeprefix('Key.').strip("'")
        return {'cmd_l':'cmd', 'cmd_r':'cmd', 'shift_l':'shift', 'shift_r':'shift',
                'alt_l':'alt', 'alt_r':'alt', 'ctrl_l':'ctrl', 'ctrl_r':'ctrl'}.get(value, value)

    @staticmethod
    def runNewProcess(path, args=''):
        arguments = shlex.split(args) if isinstance(args, str) else list(args)
        if str(path).endswith('.app'):
            command = ['/usr/bin/open', '-n', '-a', str(path), '--args'] + arguments
        else:
            command = [str(path)] + arguments
        return subprocess.Popen(command)

    @staticmethod
    def startfile(path):
        # Absolute local paths cannot be parsed as open(1) options.
        return subprocess.Popen(['/usr/bin/open', str(Path(path).absolute())])
