const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// List of 48 supported programming language names (lowercase)
const SUPPORTED_LANGUAGES = [
  'javascript', 'python', 'java', 'typescript', 'c#', 'c++', 'c', 'php', 'ruby', 'go',
  'rust', 'swift', 'kotlin', 'dart', 'scala', 'r', 'lua', 'perl', 'haskell', 'elixir',
  'clojure', 'erlang', 'shell / bash', 'powershell', 'objective-c', 'assembly', 'sql',
  'html', 'css', 'zig', 'nim', 'crystal', 'julia', 'f#', 'ocaml', 'groovy', 'fortran',
  'cobol', 'pascal / delphi', 'd', 'scheme', 'racket', 'prolog', 'v (vlang)', 'solidity',
  'matlab', 'apex', 'actionscript'
];

// -------------------------------------------------------------
// GET /api/languages
// Proxies static languages JSON from Firebase Hosting
// -------------------------------------------------------------
app.get('/api/languages', async (req, res) => {
  try {
    const response = await fetch('https://ramapi-c7203.web.app/languages.json');
    if (!response.ok) {
      throw new Error(`Firebase returned status ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching languages.json:', err);
    res.status(500).json({ error: 'Failed to fetch static languages JSON', message: err.message });
  }
});

// -------------------------------------------------------------
// POST /api/v1/run
// Executes code with validation for languages, unsupported languages, files, stdin, and custom cmd
// -------------------------------------------------------------
app.post('/api/v1/run', (req, res) => {
  const { files, languages, stdin = '', cmd } = req.body;

  // 1. Check if languages payload is missing or empty -> return 404
  if (!languages || !Array.isArray(languages) || languages.length === 0) {
    return res.status(404).json({ error: 'Not Found', message: 'languages not found' });
  }

  // 2. Check for unsupported languages -> return 400
  const hasUnsupported = languages.some(lang => {
    const langName = (lang.name || '').toLowerCase().trim();
    return !SUPPORTED_LANGUAGES.includes(langName);
  });

  if (hasUnsupported) {
    return res.status(400).json({ error: 'Bad Request', message: 'unsupported language' });
  }

  // 3. Check if files payload is missing or empty -> return 400
  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Bad Request', message: 'Field "files" must be a non-empty array' });
  }

  // Create isolated temp directory for execution
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-'));

  try {
    // Write all input files to temporary workspace
    files.forEach((file) => {
      const filePath = path.join(tempDir, file.name || 'main');
      fs.writeFileSync(filePath, file.content || '');
    });

    // Determine execution command (uses custom cmd or defaults to running first file)
    const mainFileName = files[0].name || 'main';
    const mainFilePath = path.join(tempDir, mainFileName);
    const executionCmd = cmd || `python3 ${mainFilePath}`;

    // Spawn child process and execute with timeout
    const processExec = exec(
      executionCmd,
      {
        cwd: tempDir,
        timeout: 10000, // 10-second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      },
      (error, stdout, stderr) => {
        // Clean up temporary workspace directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        res.json({
          receivedLanguagesCount: languages.length,
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error.code !== undefined ? error.code : 1) : 0,
          error: error ? error.message : null
        });
      }
    );

    // Write stdin payload to standard input stream
    if (stdin && processExec.stdin) {
      processExec.stdin.write(stdin);
      processExec.stdin.end();
    }
  } catch (err) {
    // Clean up temporary directory on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    res.status(500).json({ error: 'Execution error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
