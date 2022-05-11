const path = require("path");
const fs = require("fs");
const ts = require("typescript");
// const EXTENSIONS = ["ts", "tsx", "js"];
// const results = [];
const REGEXP_EXTENSIONS = /\.(ts|tsx|js)$/;
let rootPath = path.join("src");

const getFiles = () => {

  const files = [rootPath]
  const results = [];

  while (files.length) {
    const currentPath = files.shift();
    console.log('currentPath', currentPath)
    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((file) => {
      if (file.isFile() && REGEXP_EXTENSIONS.test(file.name)) {
        //read a file
        try {
          const data = fs.readFileSync(path.join(currentPath, file.name), 'utf8');
          // console.log(data);

          //to do a parser
          let tsSourceFile = ts.createSourceFile(
            __filename,
            data,
            ts.ScriptTarget.Latest
          );
          console.log('tsSourceFile', tsSourceFile)
          // Print the parsed Abstract Syntax Tree (AST).
          tsSourceFile.statements;

        } catch (err) {
          console.error(err);
        }

        results.push(file.name);
      } else if (file.isDirectory()) {
        files.push(path.join(currentPath, file.name))
      }
    })
  }

  return results;
};

// const getFiles = ({ rootPath }) => {
//   const files = fs.readdirSync(rootPath, { withFileTypes: true });

//   files.forEach((file) => {
//     if (file.isDirectory()) {
//       const name = path.join(rootPath, file.name);
//       getFiles({ rootPath: name });
//     } else if (REGEXP_EXTENSIONS.test(file.name)) {
//       results.push(file.name);
//     }
//   });

//   return results;
// };
console.log(getFiles());

// console.log(getFiles({ rootPath: path.resolve('src')}));

// let files = fs.readdirSync(rootPath, { withFileTypes: true });
// files.forEach(file => {
//     if (file.isDirectory()) {
//         let name = path.join(rootPath, file.name);
//         getFiles(name, results)
//     }
//     if (file.name.match(tsExpression)) {
//         results.push(file.name);
//     }
// })
// return results;
