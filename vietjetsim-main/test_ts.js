const fs = require('fs');
const ts = require('typescript');
const file = 'src/app/flight-booking/components/FlightResultsStep.tsx';
const content = fs.readFileSync(file, 'utf8');
const program = ts.createProgram([file], { jsx: ts.JsxEmit.Preserve });
const diagnostics = ts.getPreEmitDiagnostics(program);
diagnostics.forEach(diag => {
  if (diag.file) {
    let pos = diag.file.getLineAndCharacterOfPosition(diag.start);
    console.log('Line ' + (pos.line + 1) + ', Col ' + (pos.character + 1) + ': ' + ts.flattenDiagnosticMessageText(diag.messageText, '\\n'));
  }
});
