import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Embed the ORIGINAL file without redrawing, cropping, recompressing or changing
// its pixels. All existing /logo.svg references (including favicon) keep working.
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let selected = process.argv[2];

try {
  if (selected === '--choose' || !selected) {
    if (process.platform !== 'win32') {
      throw new Error('Supply the image path: node scripts/set-logo.mjs /path/to/logo.png');
    }
    const picker = `
      [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
      Add-Type -AssemblyName System.Windows.Forms
      $picker = New-Object System.Windows.Forms.OpenFileDialog
      $picker.Title = 'Select the original EsseKZ logo image'
      $picker.Filter = 'PNG and JPEG images|*.png;*.jpg;*.jpeg'
      if ($picker.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::Write($picker.FileName)
      }
      $picker.Dispose()
    `;
    selected = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-STA', '-EncodedCommand', Buffer.from(picker, 'utf16le').toString('base64')],
      { encoding: 'utf8', maxBuffer: 16384 },
    ).trim();
    if (!selected) {
      console.log('Cancelled. The logo was not changed.');
      process.exit(0);
    }
  }

  const bytes = await readFile(path.resolve(selected));
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Choose an image smaller than 5 MB.');
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new Error('The selected file must be an actual PNG or JPEG image.');
  const type = png ? 'image/png' : 'image/jpeg';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><image width="100" height="100" preserveAspectRatio="xMidYMid meet" href="data:${type};base64,${bytes.toString('base64')}"/></svg>\n`;

  const backup = path.join(project, '.local', 'logo-backups');
  await mkdir(backup, { recursive: true });
  try {
    await copyFile(
      path.join(project, 'public', 'logo.svg'),
      path.join(backup, `logo-${Date.now()}.svg`),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(path.join(project, 'public', 'logo.svg'), svg, 'utf8');
  console.log('DONE: public/logo.svg now contains your original image.');
  console.log('Open the site and press Ctrl+F5. If the server is stopped: npm.cmd run dev');
  console.log('Previous logos are backed up in .local/logo-backups.');
  console.log(
    'This changes the local project. To update GitHub, upload public/logo.svg to the same branch.',
  );
} catch (error) {
  console.error('Logo update failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}
