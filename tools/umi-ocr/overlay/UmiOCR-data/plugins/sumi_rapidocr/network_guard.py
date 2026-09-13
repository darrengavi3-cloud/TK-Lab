"""Opt-in kernel network-denial validation for Linux and macOS.

Opt-in in the test worker. Fails closed if libseccomp is unavailable; it never
claims an OS-level isolation result from the normal Python socket guard.
"""
import ctypes
import ctypes.util
import errno
import sys


def deny_network_syscalls():
    if sys.platform == 'darwin':
        return verify_macos_network_denial()
    if not sys.platform.startswith('linux'):
        raise RuntimeError('Kernel offline validation requires Linux and libseccomp')
    name = ctypes.util.find_library('seccomp')
    if not name:
        raise RuntimeError('libseccomp is unavailable')
    lib = ctypes.CDLL(name, use_errno=True)
    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    lib.seccomp_release.argtypes = [ctypes.c_void_p]
    context = lib.seccomp_init(0x7fff0000)  # SCMP_ACT_ALLOW
    if not context:
        raise RuntimeError('Could not initialize seccomp')
    names = ('socket', 'socketpair', 'connect', 'sendto', 'sendmsg', 'sendmmsg')
    try:
        for syscall in names:
            number = lib.seccomp_syscall_resolve_name(syscall.encode())
            if number < 0 or lib.seccomp_rule_add(context, 0x00050000 | errno.ENETUNREACH, number, 0) != 0:
                raise RuntimeError('Could not deny syscall: '+syscall)
        if lib.seccomp_load(context) != 0:
            raise RuntimeError('Could not enable kernel network isolation')
    finally:
        lib.seccomp_release(context)
    # Bypass Python socket wrappers to prove the kernel actually rejects a socket.
    libc = ctypes.CDLL(None, use_errno=True)
    for family in (2, 10):  # AF_INET, AF_INET6
        fd = libc.socket(family, 1, 0)
        if fd >= 0:
            libc.close(fd)
            raise RuntimeError('Kernel network probe unexpectedly succeeded')
        if ctypes.get_errno() != errno.ENETUNREACH:
            raise RuntimeError('Unexpected kernel network probe error')
    return {'mechanism':'linux-libseccomp', 'denied_syscalls':list(names),
            'ipv4_socket_denied':True, 'ipv6_socket_denied':True}


def verify_macos_network_denial():
    """Verify the sandbox-exec profile installed by the parent before exec.

    A normal worker must fail this probe. ECONNREFUSED / an unreachable network
    is not evidence of sandbox enforcement. Probe libc, before Python wrappers.
    """
    import socket
    import struct
    libc = ctypes.CDLL(None, use_errno=True)
    libc.connect.argtypes = [ctypes.c_int, ctypes.c_void_p, ctypes.c_uint32]
    libc.connect.restype = ctypes.c_int
    probes = {}
    for family, name, packed in (
        (socket.AF_INET, 'ipv4', struct.pack('BB', 16, socket.AF_INET) +
         struct.pack('!H', 9) + socket.inet_pton(socket.AF_INET, '127.0.0.1') + bytes(8)),
        (socket.AF_INET6, 'ipv6', struct.pack('BB', 28, socket.AF_INET6) +
         struct.pack('!H', 9) + bytes(4) + socket.inet_pton(socket.AF_INET6, '::1') + bytes(4)),
    ):
        fd = libc.socket(family, socket.SOCK_STREAM, 0)
        if fd < 0:
            if ctypes.get_errno() in (errno.EPERM, errno.EACCES):
                probes[name+'_socket_denied'] = True
                continue
            raise RuntimeError('Cannot create macOS network probe socket')
        try:
            address = ctypes.create_string_buffer(packed)
            ctypes.set_errno(0)
            result = libc.connect(fd, address, len(packed))
            error = ctypes.get_errno()
            if result != -1 or error not in (errno.EPERM, errno.EACCES):
                raise RuntimeError('macOS network sandbox proof missing: ' + name)
            probes[name+'_connect_denied'] = True
        finally:
            libc.close(fd)
    return {'mechanism':'macos-sandbox-exec', 'profile':'(version 1) (allow default) (deny network*)',
            'deprecated_system_tool':True, **probes}
