"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// src/extension.ts
var vscode = require("vscode");
var child_process_1 = require("child_process");
var fs = require("fs");
var path = require("path");
var currentDecorations = [];
function activate(context) {
    var diagnosticCollection = vscode.languages.createDiagnosticCollection('velvet');
    context.subscriptions.push(diagnosticCollection);
    // Listen for document changes on files with the .velvet extension.
    vscode.workspace.onDidChangeTextDocument(function (event) {
        if (path.extname(event.document.fileName) !== '.velvet') {
            return;
        }
        runCompiler(event.document, diagnosticCollection);
    });
}
function runCompiler(document, diagCollection) {
    // Get the compiler command from settings.
    var compilerPath = vscode.workspace.getConfiguration('velvet').get('compiler');
    if (!compilerPath) {
        console.warn("Velvet compiler path not set in settings.");
        return;
    }
    // Use the document's fsPath or write out a temporary copy if the document is unsaved.
    var filePath = document.uri.fsPath;
    if (document.isDirty) {
        var tmpFilePath = path.join('/tmp', path.basename(document.fileName));
        try {
            fs.writeFileSync(tmpFilePath, Buffer.from(document.getText()));
            filePath = tmpFilePath;
        }
        catch (error) {
            console.error("Failed to write temporary file at ".concat(tmpFilePath, ":"), error);
            return;
        }
    }
    // Spawn the compiler process.
    var proc = (0, child_process_1.spawn)(compilerPath, [filePath]);
    var stdoutBuffer = '';
    var stderrBuffer = '';
    // Timeout after 200ms if the process doesn't finish.
    var killTimer = setTimeout(function () {
        proc.kill();
        console.log('Compiler process killed due to timeout');
    }, 200);
    proc.stdout.on('data', function (data) {
        stdoutBuffer += data.toString();
    });
    proc.stderr.on('data', function (data) {
        stderrBuffer += data.toString();
    });
    proc.on('close', function (exitCode) {
        clearTimeout(killTimer);
        var diagnostics = [];
        var validJsonCount = 0;
        // Process each line of the compiler output.
        var lines = stdoutBuffer.split('\n');
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmedLine = line.trim();
            if (!trimmedLine) {
                continue;
            }
            try {
                var json = JSON.parse(trimmedLine);
                if (json && typeof json.kind === 'string' &&
                    typeof json.message === 'string' &&
                    Array.isArray(json.positions) && json.positions.length > 0) {
                    validJsonCount++;
                    var positions = json.positions;
                    // The last position is considered the primary error location.
                    var mainOffset = positions[positions.length - 1];
                    var mainPos = document.positionAt(mainOffset);
                    var mainRange = document.getWordRangeAtPosition(mainPos) || new vscode.Range(mainPos, mainPos);
                    var diagnostic = new vscode.Diagnostic(mainRange, json.message, vscode.DiagnosticSeverity.Error);
                    // Add the trace points (if any) as related information.
                    if (positions.length > 1) {
                        diagnostic.relatedInformation = [];
                        for (var i = 0; i < positions.length - 1; i++) {
                            var traceOffset = positions[i];
                            var tracePos = document.positionAt(traceOffset);
                            var traceRange = document.getWordRangeAtPosition(tracePos) || new vscode.Range(tracePos, tracePos);
                            diagnostic.relatedInformation.push(new vscode.DiagnosticRelatedInformation(new vscode.Location(document.uri, traceRange), "Trace point ".concat(i + 1)));
                        }
                    }
                    diagnostics.push(diagnostic);
                    // Store the positions on the diagnostic object (for later use in decoration).
                    diagnostic.tracePositions = positions;
                }
            }
            catch (err) {
                // Ignore lines that aren't valid JSON.
            }
        }
        // If nothing valid was parsed and the compiler returned an error code, show a generic diagnostic.
        if (validJsonCount === 0 && exitCode !== 0) {
            var genericRange = new vscode.Range(document.positionAt(0), document.positionAt(1));
            diagnostics.push(new vscode.Diagnostic(genericRange, "Compiler returned error code ".concat(exitCode, ". StdErr: ").concat(stderrBuffer), vscode.DiagnosticSeverity.Error));
        }
        diagCollection.set(document.uri, diagnostics);
        updateCircleDecorations(document, diagnostics);
    });
}
/**
 * Updates decorations by placing a small circle at each traced (bad) position.
 * The circle is generated on the fly as an inline SVG (data URI) and added
 * as a decoration in the editor’s "before" slot.
 */
function updateCircleDecorations(document, diagnostics) {
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString() === document.uri.toString()) {
        // Dispose previous decorations.
        for (var _i = 0, currentDecorations_1 = currentDecorations; _i < currentDecorations_1.length; _i++) {
            var deco = currentDecorations_1[_i];
            deco.dispose();
        }
        currentDecorations = [];
        var editor = vscode.window.activeTextEditor;
        // Define the inline SVG for a small circle.
        var circleSVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\" viewBox=\"0 0 10 10\">\n  <circle cx=\"5\" cy=\"5\" r=\"4\" fill=\"red\"/>\n</svg>";
        var circleDataUri = vscode.Uri.parse("data:image/svg+xml;utf8,".concat(encodeURIComponent(circleSVG)));
        // Create a common decoration type for the small circle.
        // The decoration will be inserted "before" the text.
        var circleDecorationType = vscode.window.createTextEditorDecorationType({
            before: {
                contentIconPath: circleDataUri,
                height: '10px',
                width: '10px',
                margin: '0 4px 0 0'
            }
        });
        currentDecorations.push(circleDecorationType);
        // Create an array of decoration options for each trace point.
        var decorationOptions = [];
        for (var _a = 0, diagnostics_1 = diagnostics; _a < diagnostics_1.length; _a++) {
            var diag = diagnostics_1[_a];
            var tracePositions = diag.tracePositions;
            if (tracePositions) {
                for (var _b = 0, tracePositions_1 = tracePositions; _b < tracePositions_1.length; _b++) {
                    var offset = tracePositions_1[_b];
                    var pos = document.positionAt(offset);
                    decorationOptions.push({
                        range: new vscode.Range(pos, pos),
                        hoverMessage: 'Error trace point'
                    });
                }
            }
        }
        // Apply the decorations to the editor.
        editor.setDecorations(circleDecorationType, decorationOptions);
    }
}
