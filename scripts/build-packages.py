import subprocess
import os

# Find the project root by locating next.config.ts
possible_roots = [
    '/vercel/share/v0-project',
    os.path.expanduser('~/v0-project'),
    os.getcwd(),
]

root = None
for candidate in possible_roots:
    if os.path.exists(os.path.join(candidate, 'package.json')):
        root = candidate
        break

if not root:
    # Try searching from cwd upward
    cwd = os.getcwd()
    print(f"[v0] cwd: {cwd}")
    print(f"[v0] ls cwd: {os.listdir(cwd)}")
    raise RuntimeError("Could not locate project root")

src_dir = os.path.join(root, 'src')
print(f"[v0] Project root: {root}")
print(f"[v0] src dir: {src_dir}")
print(f"[v0] src contents: {os.listdir(src_dir)}")

packages = [
    d for d in os.listdir(src_dir)
    if os.path.isdir(os.path.join(src_dir, d))
    and os.path.exists(os.path.join(src_dir, d, 'package.json'))
    and os.path.exists(os.path.join(src_dir, d, 'tsconfig.json'))
]

print(f"[v0] Building {len(packages)} packages: {packages}")

for pkg in packages:
    pkg_dir = os.path.join(src_dir, pkg)
    print(f"[v0] Building {pkg}...")
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=pkg_dir,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"[v0] Built {pkg} successfully")
    else:
        print(f"[v0] Warning: {pkg} errors:\n{result.stderr[:500]}")

print("[v0] All packages processed.")
