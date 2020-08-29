#!/usr/bin/env node
// -*-mode: js2-mode -*-

const argv = process.argv

const fs = require('fs/promises')
const bufSize = 1000000
let sum = 0
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
          if (!span(start, date, stack[stack.length - 1])) {
            console.log('bad )))', start, m)
          }
        } else if (op === '),(') {
          const start = stack.pop()
          if (!span(start, date, stack[stack.length - 1])) {
            console.log('bad ):(', start, m)
          }
          stack.push(entry)
        } else {
          const [hs, ms] = op.split(':')
          const hours = parseFloat(hs) || 0
          const minutes = parseFloat(ms) || 0
          const dur = 3600000 * hours + 60000 * minutes
          if (!span({text, date: new Date(date - dur)}, date, stack[stack.length - 1])) {
            console.log('bad h:m', m)
          }
        }
      } else {
        console.log('bad format: %o', line)
      }
    }
    
  }
  // console.log('stats:', {lineCount, cmdCount})


  if (sum) {
    if (!argv.includes('--csv')) {
      console.log('#  total: ', Math.round(sum * 100) / 100)
    }
    sum = 0
  }

  if (stack.length) {
    console.log('\n some unclosed entries: %O', stack.slice(0,5))
  }
}

let prevDay
function span(entry, stop, lowerEntry) {
  let {text, date: start, missing} = entry
  if (!missing) missing = 0

  const passed = stop - start
  const used = stop - start - missing

  const hoursPassed = Math.round((passed)/36000) / 100
  const hoursUsed = Math.round((used)/36000) / 100
  // console.warn('%o', {entry, stop, lowerEntry, hours, lowerEntry})
  if (isNaN(hoursUsed)) {
    return false
  }

  // skip a line if "new day"
  const adjstop = new Date(stop - 3600 * 1000 * 5) // 5 am
  if (adjstop.getDate() != prevDay) {
    if (sum) {
      if (!argv.includes('--csv')) {
        console.log('#  total: ', Math.round(sum * 100) / 100)
      }
      sum = 0
    }
    console.log()
    prevDay = adjstop.getDate()
  }

  let skip = false
  if (argv.includes('--work')) {
    if (text.startsWith('-')) skip = true
  }
  if (!skip) {
    if (argv.includes('--csv')) {
      console.log('%s\t%s\t%s\t%s', ('' + prevDay).padStart(2), ('' + hoursUsed).padStart(6), text.padEnd(40), stop.toLocaleString("en-US").padEnd(22))
    } else {
      console.log(('' + hoursUsed).padStart(6), ' +# ', stop.toLocaleString("en-US").padEnd(22), '  ', text)// , start) // , stop, missing)
      sum += hoursUsed
    }
  }

  if (lowerEntry) {
    lowerEntry.missing = (lowerEntry.missing || 0) + passed
  }
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
