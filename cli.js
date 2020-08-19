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
  let stack = []
  for (const line of lines) {
    lineCount++
    if (line.startsWith('$$ ')) {
      cmdCount++
      if (line.startsWith('$$ restart')) {
        stack = []
        continue
      }
      
      // console.log(line)
      const m = line.match(/^\$\$ (.*?(\d\d\d\d)) ?(.*)/)
      if (m) {
        // console.log(m)
        const datePart = m[1]
        let date
        try {
          date = new Date(datePart)
          const iso = date.toISOString()
        } catch (e) {
          console.error('BAD DATE', m, datePart, date)
          continue
        }
        const [op, ...wordList] = m[3].split(' ')
        const text = wordList.join(' ')
        
        // console.log('\n', date.toISOString(), op, text)
        const entry = {date, text}

        if (op === '(((') {
          stack.push(entry)
        } else if (op === ')))') {
          const start = stack.pop()
          if (!start) console.error('too many )))')
          if (!span(start.text, start.date, date)) {
            console.log('bad )))', start, m)
          }
        } else if (op === '),(') {
          const start = stack.pop()
          if (!span(start.text, start.date, date)) {
            console.log('bad ):(', start, m)
          }
          stack.push(entry)
        } else {
          const [hs, ms] = op.split(':')
          const hours = parseFloat(hs) || 0
          const minutes = parseFloat(ms) || 0
          const dur = 3600000 * hours + 60000 * minutes
          if (!span(text, new Date(date - dur), date)) {
            console.log('bad h:m', m)
          }
        }
      } else {
        console.log('bad format: %o', line)
      }
    }
    
  }
  // console.log('stats:', {lineCount, cmdCount})

  if (stack.length) {
    console.log('\n some unclosed entries: %O', stack.slice(0,5))
  }
}

let prevDay
function span(activity, start, stop) {
  const hours = Math.round((stop - start)/36000) / 100
  if (isNaN(hours)) return false
  const adjstop = new Date(stop - 3600 * 1000 * 5) // 5 am
  if (adjstop.getDay() != prevDay) {
    console.log()
    prevDay = adjstop.getDay()
  }
  console.log(stop.toLocaleString("en-US").padEnd(22), ('' + hours).padStart(6), '  ', activity)
  return true
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
