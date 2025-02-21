import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const log = vscode.window.createOutputChannel('pretty-jsdoc');

    let currentSyntaxDecoration: vscode.TextEditorDecorationType;
    let currentBackgroundDecoration: vscode.TextEditorDecorationType;
    let isEnabled = false;

    function updateDecorations(editor: vscode.TextEditor) {
        if (!editor || !isEnabled) return;

        if (currentSyntaxDecoration) {
            currentSyntaxDecoration.dispose();
        }
        if (currentBackgroundDecoration) {
            currentBackgroundDecoration.dispose();
        }

        currentSyntaxDecoration = vscode.window.createTextEditorDecorationType({
            opacity: '0'
        });

        currentBackgroundDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
            isWholeLine: true,
        });

        const document = editor.document;
        const syntaxDecorations: vscode.DecorationOptions[] = [];
        const backgroundDecorations: vscode.DecorationOptions[] = [];
        
        let isInJSDoc = false;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            if (text.includes('/**')) {
                isInJSDoc = true;
            }

            if (isInJSDoc) {
                backgroundDecorations.push({
                    range: line.range
                });

                const matches = text.match(/\/\*\*|\*\/|\s*\*\s/g);
                if (matches) {
                    matches.forEach(match => {
                        const startPos = text.indexOf(match);
                        const range = new vscode.Range(
                            new vscode.Position(i, startPos),
                            new vscode.Position(i, startPos + match.length)
                        );
                        syntaxDecorations.push({
                            range: range
                        });
                    });
                }
            }

            if (text.includes('*/')) {
                isInJSDoc = false;
            }
        }

        editor.setDecorations(currentSyntaxDecoration, syntaxDecorations);
        editor.setDecorations(currentBackgroundDecoration, backgroundDecorations);
    }

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document === vscode.window.activeTextEditor?.document) {
            updateDecorations(vscode.window.activeTextEditor);
        }
    });

    const changeEditorSubscription = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            updateDecorations(editor);
        }
    });

    let toggleDisposable = vscode.commands.registerCommand('pretty-jsdoc.toggle', () => {
        isEnabled = !isEnabled;
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        if (isEnabled) {
            updateDecorations(editor);
        }
        else {
            if (currentSyntaxDecoration) {
                currentSyntaxDecoration.dispose();
            }
            if (currentBackgroundDecoration) {
                currentBackgroundDecoration.dispose();
            }
        }
    });

    context.subscriptions.push(
        toggleDisposable,
        changeDocumentSubscription,
        changeEditorSubscription
    );
    vscode.commands.executeCommand('pretty-jsdoc.toggle');
}

export function deactivate() {}