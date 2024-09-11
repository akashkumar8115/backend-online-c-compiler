const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();

// CORS setup
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type']
}));

// Middleware for parsing JSON requests
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

// POST route to compile and execute C++ code with input
app.post('/run', (req, res) => {
    const code = req.body.code;
    const input = req.body.input;
    const tempDir = os.tmpdir();  // Temporary directory to store the code file
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
    console.log(`Compile Command: ${compileCommand}`);

    exec(compileCommand, (compileError, stdout, stderr) => {
        if (compileError) {
            console.error('Compilation Error:', stderr);
            cleanUpFiles(inputFile, outputFile); // Clean up even on error
            return res.status(500).json({ output: `Compilation Error:\n${stderr}` });
        }

        // Run the compiled executable and pass the input using spawn
        const runProcess = spawn(outputFile, [], { stdio: ['pipe', 'pipe', 'pipe'] });
        runProcess.stdin.write(input); // Pass input to the process
        runProcess.stdin.end(); // Close input stream

        let output = '';
        runProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        runProcess.stderr.on('data', (data) => {
            console.error('Runtime Error:', data.toString());
            return res.status(500).json({ output: `Runtime Error:\n${data.toString()}` });
        });

        runProcess.on('close', (code) => {
            cleanUpFiles(inputFile, outputFile); // Clean up after execution
            res.json({ output });
        });
    });
});

// Start the server on port 5000
app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
