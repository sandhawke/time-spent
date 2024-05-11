import fs from 'node:fs'
import * as readline from 'node:readline'

export async function readMatchingLines (filename) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filename)

    let timeLines = []
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
      if (line == null) return
      lineNumber++
      // wtf, it counts 80 lines (0.0029% too high.  What is it counting?)
      // Oh, it was ^M's
      if (line.startsWith('$$ ')) {
        if (line.startsWith('$$ restart')) {
          timeLines = []
          return
        }
        timeLines.push({text: line, lineNumber})
      }
    });
    
    // Event handler for the 'close' event
    rl.on('close', () => {
      console.error('%s time lines, %s lines', timeLines.length, lineNumber)
      resolve(timeLines)
    });
  })
}

export function processTimeStack (lines, argv) {
  let prevDay
  let prevStart
  let sum = 0
  let cmdCount = 0
  let stack = []
  
  for (const {text: line, lineNumber} of lines) {
    // console.log({line, lineNumber})
    if (line.startsWith('$$ ')) {
      cmdCount++
      if (line.startsWith('$$ restart')) {
        console.error('Restarting, with %o stack frames', stack.length)
        stack = []
        continue
      }
      
      if (line.startsWith('$$ stack')) {
        console.error('Stack at %o is', {line, lineNumber}, stack)
        continue
      }
      
      // console.log(line)
      const m = line.match(/^\$\$ (.*?(\d\d\d\d)) ?(.*)/)
      if (m) {
        // console.log(m)
        let datePart = m[1]
        datePart = datePart.replace(/IST|CEST|CET/, 'GMT') // close enough, and JS wont parse those
        let date
        try {
          date = new Date(datePart)
          const iso = date.toISOString()
        } catch (e) {
          console.error('BAD DATE', m, datePart, date, {lineNumber})
          continue
        }
        const [op, ...wordList] = m[3].split(' ')
        const text = wordList.join(' ')
        
        // console.log('\n', date.toISOString(), op, text)
        const entry = {date, text, startingLineNumber: lineNumber}

        if (op === '(((') {
          stack.push(entry)
        } else if (op === ')))') {
          const start = stack.pop()
          if (!start) console.error('too many ))) at line ', {lineNumber})
          if (!span(start, date, stack[stack.length - 1], lineNumber)) {
            console.error('bad )))', start, m, {lineNumber})
          }
        } else if (op === '),(') {
          const start = stack.pop()
          if (!start) console.error('),( when not open at line ', {lineNumber})
          if (!span(start, date, stack[stack.length - 1], lineNumber)) {
            console.error('bad ),(', start, m, {lineNumber})
          }
          stack.push(entry)
        } else if (op.match(/^\d+:\d+$/)) {
          const [hs, ms] = op.split(':')
          const hours = parseFloat(hs) || 0
          const minutes = parseFloat(ms) || 0
          const dur = 3600000 * hours + 60000 * minutes
          if (!span({text, date: new Date(date - dur)}, date, stack[stack.length - 1], lineNumber)) {
            console.error('bad h:m', m)
          }
        } else if (op === '') {
          // ignore
        } else {
          console.error('bad line', {lineNumber}, line)
        }
      } else {
        if (line.match(/LANGUAGE plpgsql/)) continue
        if (line.match(/^\$\$ money/)) continue
        if (line.match(/^\$\$ IRF HOURS/)) continue
        console.error('bad format: %o', line, {lineNumber})
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
    console.error('\n\n## Warning: %s unclosed entries:\n%O', stack.length, stack.slice(0,5))
  }

  function span(entry, stop, lowerEntry, endingLineNumber) {
    let {text, date: start, missing, startingLineNumber} = entry
    if (!missing) missing = 0

    const passed = stop - start
    const used = stop - start - missing

    const hoursPassed = Math.round((passed)/36000) / 100
    const hoursUsed = Math.round((used)/36000) / 100
    // console.warn('%o', {entry, stop, lowerEntry, hours, lowerEntry})
    if (isNaN(hoursUsed)) {
      return false
    }
    if (hoursPassed > 24) {
      console.error('\n\n# warning: entry over 24 hours lines %s - %s text=%o', entry.startingLineNumber, endingLineNumber, text)
      // return false
    }
    if (hoursPassed < 0) {
      console.error('\n\n# warning: entry has negative time, lines %s - %s text=%o', entry.startingLineNumber, endingLineNumber, text)
      // return false
    }

    // skip a line if "new day"
    const adjstop = new Date(stop - 3600 * 1000 * 5) // 5 am
    // console.log(adjstop.getDate(), prevDay)
    if (adjstop.getDate() != prevDay) {
      // console.log('new day', {prevDay, sum, stop})
      if (sum) {
        if (argv.includes('--csv')) {
          if (argv.includes('--day')) {
            console.log('%s\t\%s', (new Date(prevStart - 3600 * 1000 * 5)).toISOString().slice(0,10), Math.round(sum * 100) / 100)
          }
        } else {
          console.log('#  total: %o  day of month: %s', Math.round(sum * 100) / 100, prevDay)
          console.log()
        }
        sum = 0
      }
      prevDay = adjstop.getDate()
    }
    prevStart = start

    let skip = false
    if (argv.includes('--work')) {
      if (text.startsWith('-')) skip = true
    }
    if (!skip) {
      if (argv.includes('--csv')) {
        if (!argv.includes('--day')) {
          console.log('%s\t%s\t%s\t%s\t%s', ('' + prevDay).padStart(2), ('' + hoursUsed).padStart(6), text.padEnd(40), stop.toLocaleString("en-US").padEnd(22), endingLineNumber)
        }
      } else {
        console.log(('' + hoursUsed).padStart(6), ' +# ', stop.toLocaleString("en-US").padEnd(22), '  ', text)// , start) // , stop, missing)
      }
      sum += hoursUsed
    }

    if (lowerEntry) {
      lowerEntry.missing = (lowerEntry.missing || 0) + passed
    }
    return true
  }
}
