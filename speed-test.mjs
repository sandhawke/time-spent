import {readMatchingLines} from './index.mjs'

const lines = await readMatchingLines('/home/sandro/log')
console.log(lines.slice(-5))
/*
  import fs from 'node:fs'
import * as readline from 'node:readline'

const fileStream = fs.createReadStream('/home/sandro/log')

const timeLines = []
let lineNumber = 0

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

// Function to process each line
function processLine(line) {
  // Add your processing logic here
  console.log(`Processing line: ${line}`);
}

// Event handler for the 'line' event
rl.on('line', (line) => {
  lineNumber++
  if (line.startsWith('$$ ')) {
    timeLines.push(line)
  }
});

// Event handler for the 'close' event
rl.on('close', () => {
  console.log('Finished processing the large text file');
  console.log('%s time lines, %s lines', timeLines.length, lineNumber)
});
*/
