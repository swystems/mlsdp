// src/extension.ts
import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

let currentDecorations: vscode.TextEditorDecorationType[] = [];

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('velvet');
  context.subscriptions.push(diagnosticCollection);

  // Listen for document changes on files with the .velvet extension.
  vscode.workspace.onDidChangeTextDocument(event => {
    if (path.extname(event.document.fileName) !== '.velvet') {
      return;
    }
    runCompiler(event.document, diagnosticCollection);
  });
}

function runCompiler(document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection) {
  // Get the compiler command from settings.
  const compilerPath = vscode.workspace.getConfiguration('velvet').get<string>('compiler');
  if (!compilerPath) {
    console.warn("Velvet compiler path not set in settings.");
    return;
  }

  // Use the document's fsPath or write out a temporary copy if the document is unsaved.
  let filePath = document.uri.fsPath;
  if (document.isDirty) {
    const tmpFilePath = path.join('/tmp', path.basename(document.fileName));
    try {
      fs.writeFileSync(tmpFilePath, Buffer.from(document.getText()));
      filePath = tmpFilePath;
    } catch (error) {
      console.error(`Failed to write temporary file at ${tmpFilePath}:`, error);
      return;
    }
  }

  // Spawn the compiler process.
  const proc = spawn(compilerPath, [filePath]);
  let stdoutBuffer = '';
  let stderrBuffer = '';

  // Timeout after 200ms if the process doesn't finish.
  const killTimer = setTimeout(() => {
    proc.kill();
    console.log('Compiler process killed due to timeout');
  }, 200);

  proc.stdout.on('data', (data: Buffer) => {
    stdoutBuffer += data.toString();
  });

  proc.stderr.on('data', (data: Buffer) => {
    stderrBuffer += data.toString();
  });

  proc.on('close', (exitCode) => {
    clearTimeout(killTimer);
    const diagnostics: vscode.Diagnostic[] = [];
    let validJsonCount = 0;

    // Process each line of the compiler output.
    const lines = stdoutBuffer.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }
      try {
        const json = JSON.parse(trimmedLine);
        if (json && typeof json.kind === 'string' &&
            typeof json.message === 'string' &&
            Array.isArray(json.positions) && json.positions.length > 0) {
          validJsonCount++;
          const positions: number[] = json.positions;
          // The last position is considered the primary error location.
          const mainOffset = positions[positions.length - 1];
          const mainPos = document.positionAt(mainOffset);
          const mainRange = document.getWordRangeAtPosition(mainPos) || new vscode.Range(mainPos, mainPos);

          const diagnostic = new vscode.Diagnostic(mainRange, json.message, vscode.DiagnosticSeverity.Error);
          
          // Add the trace points (if any) as related information.
          if (positions.length > 1) {
            diagnostic.relatedInformation = [];
            for (let i = 0; i < positions.length - 1; i++) {
              const traceOffset = positions[i];
              const tracePos = document.positionAt(traceOffset);
              const traceRange = document.getWordRangeAtPosition(tracePos) || new vscode.Range(tracePos, tracePos);
              diagnostic.relatedInformation.push(
                new vscode.DiagnosticRelatedInformation(
                  new vscode.Location(document.uri, traceRange),
                  `Trace point ${i + 1}`
                )
              );
            }
          }
          diagnostics.push(diagnostic);
          // Store the positions on the diagnostic object (for later use in decoration).
          (diagnostic as any).tracePositions = positions;
        }
      } catch (err) {
        // Ignore lines that aren't valid JSON.
      }
    }

    // If nothing valid was parsed and the compiler returned an error code, show a generic diagnostic.
    if (validJsonCount === 0 && exitCode !== 0) {
      const genericRange = new vscode.Range(document.positionAt(0), document.positionAt(1));
      diagnostics.push(
        new vscode.Diagnostic(
          genericRange,
          `Compiler returned error code ${exitCode}. StdErr: ${stderrBuffer}`,
          vscode.DiagnosticSeverity.Error
        )
      );
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
function updateCircleDecorations(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) {
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.toString() === document.uri.toString()) {
    
    // Dispose previous decorations.
    for (const deco of currentDecorations) {
      deco.dispose();
    }
    currentDecorations = [];

    const editor = vscode.window.activeTextEditor;

    // Define the inline SVG for a small circle.
    const circleSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
  <circle cx="5" cy="5" r="4" fill="red"/>
</svg>`;
    const circleDataUri = vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(circleSVG)}`);

    // Create a common decoration type for the small circle.
    // The decoration will be inserted "before" the text.
    const circleDecorationType = vscode.window.createTextEditorDecorationType({
      before: {
        contentIconPath: circleDataUri,
        height: '10px',
        width: '10px',
        margin: '0 4px 0 0'
      }
    });
    currentDecorations.push(circleDecorationType);

    // Create an array of decoration options for each trace point.
    const decorationOptions: vscode.DecorationOptions[] = [];
    for (const diag of diagnostics) {
      const tracePositions: number[] | undefined = (diag as any).tracePositions;
      if (tracePositions) {
        for (const offset of tracePositions) {
          const pos = document.positionAt(offset);
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
