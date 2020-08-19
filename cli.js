#!/usr/bin/env node
// -*-mode: js2-mode -*-

const nexline = require('nexline')
const fs = require('fs')

// seek?  Or process in reverse order?

async function main () {
  const input = fs.openSync('/home/sandro/log', 'r')
  const position = Math.round(0.95 * 67662966)
  const buffer = Buffer.alloc(100)
  // is there a better way to seek?
  await fs.read(input, buffer, 0, 1, position, async () => {
    const nl = nexline({input})
    
    let lineCount = 0
    let cmdCount = 0
    for await (const line of nl) {
      lineCount++
      if (line.startsWith('$$ ')) {
        cmdCount++
        // console.log(line)
      }
      
    }
    console.log('stats:', {lineCount, cmdCount})
  })
}

main()

/*
  without seek

time node cli.js
stats: { lineCount: 2472571, cmdCount: 2505 }

real	0m5.859s
user	0m6.868s
sys	0m0.369s

*/
