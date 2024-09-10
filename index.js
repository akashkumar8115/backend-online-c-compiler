const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Helper function to clean up temporary files
const cleanUpFiles = (inputFile, outputFile) => {
    try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile); 
        if (fs.existsSync(outputFile + '.exe')) fs.unlinkSync(outputFile + '.exe'); 
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (err) {
        console.error('Error cleaning up files:', err);
    }
};

// Endpoint to compile and run C++ code
app.post('/run', (req, res) => {
    const code = req.body.code;
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, 'temp.cpp');
    const outputFile = path.join(tempDir, 'temp');

    // Write the C++ code to the temp.cpp file
    try {
        fs.writeFileSync(inputFile, code);
        console.log(`Wrote code to ${inputFile}`);
    } catch (err) {
        console.error('Error writing file:', err);
        return res.status(500).json({ output: `Error writing file: ${err.message}` });
    }

    // Define the command to compile the C++ code
    const compileCommand = `g++ "${inputFile}" -o "${outputFile}"`;
    const runCommand = os.platform() === 'win32' ? `"${outputFile}.exe"` : `"${outputFile}"`;

    console.log(`Compile Command: ${compileCommand}`);
    console.log(`Run Command: ${runCommand}`);

    // Compile the C++ code
    exec(compileCommand, (compileError, stdout, stderr) => {
        if (compileError) {
            console.error('Compilation Error:', stderr);
            return res.status(500).json({ output: `Compilation Error:\n${stderr}` });
        }

        // Run the compiled executable
        exec(runCommand, (runError, runStdout, runStderr) => {
            if (runError) {
                console.error('Runtime Error:', runStderr);
                return res.status(500).json({ output: `Runtime Error:\n${runStderr}` });
            }
            res.json({ output: runStdout });
        });
    });
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
