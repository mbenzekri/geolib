"use strict";

const FileHound = require('filehound');
const fs = require('fs');
const path = require('path');

const files = FileHound.create()
  .paths(__dirname + '/dist')
  .discard('node_modules')
  .ext('js')
  .find();


files.then((filePaths) => {

  filePaths.forEach((filepath) => {
    fs.readFile(filepath, 'utf8', (err, data) => {
      if (err) throw err
      let newdata = data
      let modified = false

      if (data.match(/import/g)) {
        newdata = newdata.replace(/(import\s+['"])(.*)(?=['"])/g, '$1$2.js')
        modified = true
      }

      if (data.match(/import .* from/g)) {
        newdata = newdata.replace(/(import .* from\s+['"])(.*)(?=['"])/g, '$1$2.js')
        modified = true
      }

      if (data.match(/export .* from/g)) {
        newdata = newdata.replace(/(export .* from\s+['"])(.*)(?=['"])/g, '$1$2.js')
        modified = true
      }

      if (! modified ) return 
    
      console.log(`writing to ${filepath}`)
      fs.writeFile(filepath, newdata, function (err) {
        if (err) {
          throw err;
        }
        console.log('complete');
      });
    })

  })
});