#!/usr/bin/env node
// -*-mode: js2-mode -*-

const fs = require('fs/promises')
const bufSize = 1000000
async function main () {
  const file = await fs.open('/home/sandro/log', 'r')
  const stat = await fs.stat('/home/sandro/log')
  // console.log('stat:', stat)
  const position = stat.size - bufSize
  const buffer = Buffer.alloc(bufSize)

  await file.read(buffer, 0, bufSize, position)

  const lines = buffer.toString('utf8').split('\n')

  let lineCount = 0
  let cmdCount = 0
  for (const line of lines) {
    lineCount++
    if (line.startsWith('$$ ')) {
      cmdCount++
      console.log(line)
    }
    
  }
  console.log('stats:', {lineCount, cmdCount})
}

main()

/*
  without seek

time node cli.js
stats: { lineCount: 2472571, cmdCount: 2505 }

real	0m5.859s
user	0m6.868s
sys	0m0.369s

with seek:

time node cli.js
stats: { lineCount: 37969, cmdCount: 571 }

real	0m0.059s
user	0m0.053s
sys	0m0.009s

*/
