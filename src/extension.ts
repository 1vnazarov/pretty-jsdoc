import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const log = vscode.window.createOutputChannel('pretty-jsdoc');

    function getColor(color: string) {
        return /^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/
        .test(color) ? color : new vscode.ThemeColor(color);
    }

    function getConfig(key: string) {
        const config = vscode.workspace.getConfiguration('pretty-jsdoc');
        return config.get(key, config.inspect(key)!.defaultValue as any);
    }

    let currentSyntaxDecoration: vscode.TextEditorDecorationType;
    let currentBackgroundDecoration: vscode.TextEditorDecorationType;
    let isEnabled = false;

    function disposeDecorations() {
        if (currentSyntaxDecoration) {
            currentSyntaxDecoration.dispose();
        }
        if (currentBackgroundDecoration) {
            currentBackgroundDecoration.dispose();
        }
    }

    function updateDecorations(editor: vscode.TextEditor) {
        if (!editor || !isEnabled) return;
        disposeDecorations();

        if (getConfig('hideSyntax')) {
            currentSyntaxDecoration = vscode.window.createTextEditorDecorationType({
                opacity: '0'
            });
        }

        currentBackgroundDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: getColor(getConfig('backgroundColor')),
            color: getColor(getConfig('textColor')),
            isWholeLine: true,
        });

        const document = editor.document;
        const syntaxDecorations: vscode.DecorationOptions[] = [];
        const backgroundDecorations: vscode.DecorationOptions[] = [];
        
        let isInJSDoc = false;
        let isInString = false;
        let isInRegex = false;
        let stringDelimiter = '';

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text;

            for (let j = 0; j < text.length; j++) {
                const char = text[j];

                if (!isInString && !isInRegex && text.substring(j, j + 3) === '/**') {
                    isInJSDoc = true;
                    j += 2;
                }

                if (!isInString && !isInRegex && text.substring(j, j + 2) === '*/' && isInJSDoc) {
                    isInJSDoc = false;
                    j += 1;

                    // Добавляем закрывающий комментарий в диапазон для декорирования
                    const range = new vscode.Range(
                        new vscode.Position(i, j - 1),
                        new vscode.Position(i, j + 1)
                    );
                    syntaxDecorations.push({ range });
                    backgroundDecorations.push({ range });
                }

                if (!isInRegex && (char === '"' || char === "'" || char === '`')) {
                    if (!isInString) {
                        isInString = true;
                        stringDelimiter = char;
                    }
                    else if (char === stringDelimiter) {
                        isInString = false;
                        stringDelimiter = '';
                    }
                }

                if (!isInString && char === '/' && text[j + 1] === '/') {
                    break; // Пропускаем однострочные комментарии
                }

                if (!isInString && char === '/' && text[j + 1] !== '/' && text[j + 1] !== '*') {
                    isInRegex = true;
                }

                if (isInRegex && char === '/' && text[j - 1] !== '\\') {
                    isInRegex = false;
                }
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

    const toggleDisposable = vscode.commands.registerCommand('pretty-jsdoc.toggle', () => {
        isEnabled = !isEnabled;
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        if (isEnabled) {
            updateDecorations(editor);
        }
        else {
            disposeDecorations();
        }
    });
    
    const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('pretty-jsdoc')) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                updateDecorations(editor);
            }
        }
    });

    context.subscriptions.push(
        toggleDisposable,
        changeDocumentSubscription,
        changeEditorSubscription,
        configurationChangeListener
    );

    vscode.commands.executeCommand('pretty-jsdoc.toggle');
}

export function deactivate() {}