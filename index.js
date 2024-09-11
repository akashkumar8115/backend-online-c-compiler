const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();

// CORS setup - refine in production environment
app.use(cors({
    origin: '*', // In production, change this to the allowed domain(s)
    methods: ['GET', 'POST', 'DELETE', 'PUT'], // Allow only specific methods
    allowedHeaders: ['Content-Type'] // Restrict headers to avoid potential issues
}));

// Middleware for parsing JSON requests
app.use(bodyParser.json());

// Helper function to clean up temporary files asynchronously
const cleanUpFiles = (inputFile, outputFile) => {
    try {
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(outputFile + '.exe')) fs.unlinkSync(outputFile + '.exe');
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
    } catch (err) {
        console.error('Error cleaning up files:', err);
    }
};

// Basic GET route to test if the server is running
app.get("/", (req, res) => {
    res.send("Hello World");
});

// POST route to compile and execute C++ code
app.post('/run', (req, res) => {
    const code = req.body.code;
    const tempDir = os.tmpdir(); // Temporary directory to store the code file
    const inputFile = path.join(tempDir, 'temp.cpp');
    const outputFile = path.join(tempDir, 'temp');

    // Write the C++ code to a temporary file
    try {
        fs.writeFileSync(inputFile, code);
        console.log(`Wrote code to ${inputFile}`);
    } catch (err) {
        console.error('Error writing file:', err);
        return res.status(500).json({ output: `Error writing file: ${err.message}` });
    }

    // Compile the C++ code
    const compileCommand = `g++ "${inputFile}" -o "${outputFile}"`;
    const runCommand = os.platform() === 'win32' ? `"${outputFile}.exe"` : `"${outputFile}"`;

    console.log(`Compile Command: ${compileCommand}`);
    console.log(`Run Command: ${runCommand}`);

    exec(compileCommand, (compileError, stdout, stderr) => {
        if (compileError) {
            console.error('Compilation Error:', stderr);
            cleanUpFiles(inputFile, outputFile); // Clean up even on error
            return res.status(500).json({ output: `Compilation Error:\n${stderr}` });
        }

        // Run the compiled executable
        exec(runCommand, (runError, runStdout, runStderr) => {
            cleanUpFiles(inputFile, outputFile); // Clean up after execution
            if (runError) {
                console.error('Runtime Error:', runStderr);
                return res.status(500).json({ output: `Runtime Error:\n${runStderr}` });
            }
            res.json({ output: runStdout });
        });
    });
});

// Start the server on port 5000
app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
