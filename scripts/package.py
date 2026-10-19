"""Create a self-contained Codex plugin archive from the built SDK bundle."""
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / '.codex-plugin/plugin.json').read_text())
package = json.loads((root / 'package.json').read_text())
assert manifest['version'] == package['version'], 'Plugin/package version mismatch'
paths = [
    '.agents/plugins/marketplace.json', '.codex-plugin/plugin.json', '.mcp.json',
    'assets', 'skills', 'scripts/remote.js', 'lib', 'LICENSE', 'README.md',
]
files = []
for name in paths:
    path = root / name
    if not path.exists():
        raise SystemExit(f'Missing {name}; run npm run build first')
    files.extend(sorted(p for p in path.rglob('*') if p.is_file()) if path.is_dir() else [path])
output = root / 'dist' / f'tempest-remote-codex-{manifest["version"]}.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, Path('tempest-remote-codex') / path.relative_to(root))
print(output)
