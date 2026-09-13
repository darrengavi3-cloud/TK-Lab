"""Linux-only validation helper: kernel-enforced denial of network syscalls.

Opt-in in the test worker. Fails closed if libseccomp is unavailable; it never
claims an OS-level isolation result from the normal Python socket guard.
"""
import ctypes
import ctypes.util
import errno
import sys


def deny_network_syscalls():
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
