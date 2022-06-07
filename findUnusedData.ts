// const path = require("path");
// const fs = require("fs");
// const ts = require("typescript");
// const tsESTree = require("@typescript-eslint/typescript-estree");
// const parseWithNodeMaps = require("@typescript-eslint/typescript-estree");
// const config = require("./tsconfig.json");
// const package = require("./package.json");

// // const EXTENSIONS = ["ts", "tsx", "js"];
// // const results = [];
// const REGEXP_EXTENSIONS = /\.(ts|tsx|js|jsx|d\.ts)$/;
// const REGEXP_INDEX_FILES =
//   /(\\index\.ts|\\index\.tsx|\\index\.js|\\index\.jsx)$/gi;
// const REGEXP_START_STRING = /(^\.\/|^\.\.\/)/gi;
// const rootPath = path.resolve("src");
// const CHARACTER_ENCODING = "utf8";
// const EXPORT = "Export";
// const IMPORT = "Import";
// const IMPORT_NAMESPACE = "ImportNamespaceSpecifier";
// const EXPORT_ALL = "ExportAllDeclaration";
// const DEFAULT = "default";
// const OWN_PROPERTY = {
//   DECLARATION: "declaration",
//   SPECIFIERS: "specifiers",
//   IMPORTED: "imported",
// };
// const TYPE_DECLARATION = {
//   ["TSInterfaceDeclaration"]: "Interface",
//   ["TSEnumDeclaration"]: "Enum",
//   ["TSTypeAliasDeclaration"]: "Type",
// };

// const USED_LIBRARIES = {};

// const filesMap = new Map();

// const handleVariablesInFile = (file, object) => {
//   if (filesMap.get(file)) {
//     filesMap.set(file, [...filesMap.get(file), object]);
//   } else {
//     filesMap.set(file, [object]);
//   }
// };

// const getProgram = (file) => {
//   if (file.endsWith(".ts") || file.endsWith(".js")) {
//     const data = fs.readFileSync(file, CHARACTER_ENCODING);
//     return tsESTree.parse(data);
//   }

//   if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
//     const data = fs.readFileSync(file, CHARACTER_ENCODING);
//     return tsESTree.parse(data, { jsx: true });
//   }
// };

// const getFiles = () => {
//   const files = [rootPath];
//   const results = [];

//   while (files.length) {
//     const currentPath = files.shift();

//     fs.readdirSync(currentPath, { withFileTypes: true }).forEach((file) => {
//       if (file.isFile() && REGEXP_EXTENSIONS.test(file.name)) {
//         results.push(path.resolve(currentPath, file.name));
//       } else if (file.isDirectory()) {
//         files.push(path.resolve(currentPath, file.name));
//       }
//     });
//   }
//   //will return the array of strings where string is a full path for every single file in the project
//   return results;
// };

// const allProjectFiles = getFiles();

// const getExportAllFiles = (allProjectFiles) => {
//   const exportAllFiles = [];

//   allProjectFiles.forEach((file) => {
//     const program = getProgram(file);

//     program.body.forEach((el) => {
//       if (el.type === EXPORT_ALL) {
//         const exportAllFromPath = path.resolve(
//           path.dirname(file),
//           el.source.value
//         );
//         const REGEXP_EXTENSIONS = /\.(ts|tsx|js|jsx)$/;
//         const [pathWithAllImport] = allProjectFiles.filter(
//           (path) =>
//             path.replace(REGEXP_EXTENSIONS, "") === exportAllFromPath ||
//             path.replace(REGEXP_EXTENSIONS, "") ===
//               `${exportAllFromPath}\\index`
//         );

//         exportAllFiles.push({
//           exportAllFromPath: pathWithAllImport,
//           path: file,
//         });
//       }
//     });
//   });

//   return exportAllFiles;
// };

// const handleExportedFileWithDeclaration = (el, filePath) => {
//   const exportedFiles = [];

//   if (el?.declaration?.name) {
//     handleVariablesInFile(filePath, {
//       name: el.declaration.name,
//       isFirstExport: !el?.source?.value,
//       path: filePath,
//     });

//     //for React component
//     exportedFiles.push({
//       name: el.declaration.name,
//       path: filePath,
//       isFirstExport: !el?.source?.value,
//     });
//   } else if (el?.declaration?.id?.name) {
//     handleVariablesInFile(filePath, {
//       name: el.declaration.id.name,
//       isFirstExport: !el?.source?.value,
//       path: filePath,
//     });

//     //for functions declaration, for Classes
//     exportedFiles.push({
//       name: el.declaration.id.name,
//       path: filePath,
//       isFirstExport: !el?.source?.value,
//       type: TYPE_DECLARATION[el.declaration.type] ?? "",
//     });
//   } else if (el?.declaration?.declarations) {
//     // for multiple export. also for constants
//     // example: export const one, two, three.
//     // export const NAME = 'Eva' or export const MONTH = ['Jan', 'Feb', 'Mar']

//     el.declaration.declarations.forEach((exportedFile) => {
//       handleVariablesInFile(filePath, {
//         name: exportedFile.id.name,
//         isFirstExport: !el?.source?.value,
//         path: filePath,
//       });

//       exportedFiles.push({
//         name: exportedFile.id.name,
//         path: filePath,
//         isFirstExport: !el?.source?.value,
//       });
//     });
//   }

//   return exportedFiles;
// };

// const handleExportedFileWithSpecifiers = (el, file) => {
//   const exportedFiles = [];

//   el.specifiers.forEach((exportedFile) => {
//     const firstPathWithExport = el?.source?.value
//       ? path.resolve(path.dirname(file), el.source.value)
//       : "";
//     //export { default as Button } from './acc';
//     const sourceValue = el?.source?.value.replace(REGEXP_START_STRING, "");

//     if (exportedFile.local.name === exportedFile.exported.name) {
//       handleVariablesInFile(file, {
//         name: exportedFile.local.name,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });

//       //for multiple export. example: export { sayHi, sayBuy }
//       exportedFiles.push({
//         name: exportedFile.local.name,
//         path: file,
//         sourceValue,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });
//     } else if (exportedFile.exported.name === DEFAULT) {
//       handleVariablesInFile(file, {
//         name: exportedFile.local.name,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });

//       // for variable when we do export as default. example: export { name as default }
//       exportedFiles.push({
//         name: exportedFile.local.name,
//         path: file,
//         sourceValue,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });
//     } else {
//       handleVariablesInFile(file, {
//         name: exportedFile.exported.name,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });

//       // when we change name for variable. example: export { name as name1 };
//       exportedFiles.push({
//         name: exportedFile.exported.name,
//         path: file,
//         sourceValue,
//         isFirstExport: !el?.source?.value,
//         firstPathWithExport: firstPathWithExport,
//       });
//     }
//   });

//   return exportedFiles;
// };

// const getExportedFiles = (allProjectFiles) => {
//   const exportedFiles = [];

//   try {
//     allProjectFiles.forEach((file) => {
//       const program = getProgram(file);

//       program.body.forEach((el) => {
//         if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.DECLARATION]) {
//           const results = handleExportedFileWithDeclaration(el, file);

//           exportedFiles.push(...results);
//         } else if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.SPECIFIERS]) {
//           const results = handleExportedFileWithSpecifiers(el, file);

//           exportedFiles.push(...results);
//         }
//       });
//     });
//   } catch (err) {
//     console.error(err);
//   }

//   return exportedFiles;
// };

// const exportedFiles = getExportedFiles(allProjectFiles);

// const getPath = (path, name, exportAllFiles) => {
//   let importFromPath = "";
//   const ALL_EXTENSIONS = [
//     ".ts",
//     ".tsx",
//     ".js",
//     ".jsx",
//     ".d.ts",
//     "\\index.ts",
//     "\\index.tsx",
//     "\\index.js",
//     "\\index.jsx",
//   ];

//   const findRootFile = (pathFile) => {
//     const result = exportAllFiles.filter((el) => el.path === pathFile);

//     if (result.length) {
//       result.forEach((el) => {
//         if (
//           filesMap.get(el.exportAllFromPath)?.filter((el) => el.name === name)
//             ?.length
//         ) {
//           importFromPath = el.exportAllFromPath;
//         } else {
//           findRootFile(el.exportAllFromPath);
//         }
//       });
//     }
//   };

//   ALL_EXTENSIONS.forEach((extension) => {
//     if (filesMap.get(path + extension)) {
//       const result = filesMap
//         .get(path + extension)
//         ?.filter((el) => el.name === name);
//       if (result?.length && result[0].isFirstExport) {
//         importFromPath = path + extension;
//       } else if (result?.length && !result[0].isFirstExport) {
//         const rootPath = exportedFiles.filter(
//           (el) =>
//             el.path.replace(/\.(ts|tsx|js|jsx)$/, "") ===
//             result[0].firstPathWithExport
//         );
//         const results = filesMap
//           .get(rootPath[0]?.path)
//           ?.filter((el) => el.name === name);
//         if (results?.length) {
//           importFromPath = results[0]?.path;
//         }
//       }
//     }
//   });
//   if (!importFromPath) {
//     ALL_EXTENSIONS.forEach((extension) => findRootFile(path + extension));
//   }

//   return importFromPath;
// };

// const getFullPath = (file, importFrom, name, exportAllFiles) => {
//   //C:\Users\hanna.yermakovich\Desktop\PARSE\find-unused-data\src\index.ts @func
//   let importFromPath = "";
//   const isShortPath = importFrom === ".." || importFrom === ".";
//   const isStartsWithDot =
//     importFrom.startsWith("./") || importFrom.startsWith("../");

//   if (isStartsWithDot || isShortPath) {
//     //for relative path
//     importFromPath = path.resolve(path.dirname(file), importFrom);
//     importFromPath = getPath(importFromPath, name, exportAllFiles);
//   } else if (!isStartsWithDot) {
//     //for absolute path
//     const tsconfigOptionsPaths = config.compilerOptions.paths;
//     //dependencies from package.json
//     const packageDependencies = package.dependencies;
//     if (packageDependencies[importFrom] && !tsconfigOptionsPaths[importFrom]) {
//       USED_LIBRARIES[importFrom] = package.dependencies[importFrom];
//     }

//     //if we use baseUrl, not paths
//     const fullPath = path.resolve(rootPath, importFrom);
//     const includedPaths = allProjectFiles.filter(
//       (el) => el.indexOf(fullPath) !== -1
//     );

//     if (tsconfigOptionsPaths && !includedPaths.length) {
//       const REGEXP = /.+?(?=\/)/;
//       //for cases when paths without "/*". example: "@func": ["utils/functions/functions.ts"]
//       const pathFromTsconfigPaths = tsconfigOptionsPaths[importFrom];
//       if (pathFromTsconfigPaths) {
//         importFromPath = path.resolve(
//           path.dirname(file),
//           pathFromTsconfigPaths[0]
//         );
//         if (name === "FUNCTIONS_NAME") {
//           console.log("importFromPath348", importFromPath);
//         }
//         // importFromPath = getPath(importFromPath, name, exportAllFiles);
//       }
//       //for cases when paths with "/*". example: "last/*": ["components/last/*"]
//       const keyInPaths = tsconfigOptionsPaths[importFrom.match(REGEXP) + "/*"];
//       //for case when import from dependencies ("fast-xml-parser") as 'fast-xml-parser/src/fxp'
//       const keyInDependencies = packageDependencies[importFrom.match(REGEXP)];

//       if (keyInDependencies) {
//         USED_LIBRARIES[importFrom.match(REGEXP)] =
//           packageDependencies[importFrom.match(REGEXP)];
//       }

//       if (keyInPaths) {
//         const indexOfSymbol = importFrom.indexOf("/");
//         const nameOfPath = importFrom.slice(indexOfSymbol + 1);
//         const pathFrom = path.join(
//           __dirname,
//           keyInPaths[0].replace(/(\/\*\*|\/\*|\.)/gi, "")
//         );

//         importFromPath = path.resolve(pathFrom, nameOfPath);
//         importFromPath = getPath(importFromPath, name, exportAllFiles);
//       }
//     } else {
//       importFromPath = getPath(fullPath, name, exportAllFiles);
//     }
//   }
//   // if (name === "FUNCTIONS_NAME") {
//   //   console.log("importFromPath", importFromPath);
//   // }

//   return importFromPath;
// };

// const getImportedFiles = (allProjectFiles) => {
//   const importedFiles = [];
//   const exportAllFiles = getExportAllFiles(allProjectFiles);

//   try {
//     allProjectFiles.forEach((file) => {
//       const program = getProgram(file);

//       //for one file with lazy loading
//       if (
//         file ===
//         "C:\\Users\\hanna.yermakovich\\Desktop\\src_from_max\\src\\src\\app\\routes\\AppRoutes.tsx"
//       ) {
//         program.body.forEach((el) => {
//           if (el.type.startsWith(EXPORT) && el?.declaration?.declarations) {
//             el.declaration.declarations[0]?.init?.elements?.forEach((elem) => {
//               elem?.properties?.forEach((prop) => {
//                 if (prop?.key.name === "component") {
//                   const arg = prop?.value?.arguments;
//                   if (arg) {
//                     const name = prop?.value?.arguments[1].value.split("");
//                     const updatedName = name
//                       .map((letter, index) => {
//                         if (
//                           index === 0 ||
//                           name[index - 1] === "-" ||
//                           name[index - 1] === " "
//                         ) {
//                           return letter.toUpperCase();
//                         } else if (name[index] === "-") {
//                           return "";
//                         } else {
//                           return letter;
//                         }
//                       })
//                       .join("");

//                     const importFromPath = getFullPath(
//                       file,
//                       prop?.value?.arguments[0].body.source.value,
//                       updatedName,
//                       exportAllFiles
//                     );

//                     importedFiles.push({
//                       name: updatedName,
//                       path: file,
//                       el: prop?.value?.arguments[0].body.source.value,
//                       importFrom: importFromPath,
//                     });
//                   }
//                 }
//               });
//             });
//           }
//         });
//       }

//       program.body.forEach((el) => {
//         if (el.type.startsWith(IMPORT) && el.source.value) {
//           if (!el.specifiers.length) {
//             //for import. example: import 'custom-event-polyfill';
//             getFullPath(file, el.source.value, "", exportAllFiles);
//           }
//           el.specifiers.forEach((importedFile) => {
//             if (
//               importedFile.local.name &&
//               !importedFile[OWN_PROPERTY.IMPORTED] &&
//               importedFile.type !== IMPORT_NAMESPACE
//             ) {
//               const importFromPath = getFullPath(
//                 file,
//                 el.source.value,
//                 importedFile.local.name,
//                 exportAllFiles
//               );

//               importedFiles.push({
//                 name: importedFile.local.name,
//                 path: file,
//                 el: el.source.value,
//                 importFrom: importFromPath,
//               });
//             } else if (
//               importedFile?.local?.name === importedFile?.imported?.name
//             ) {
//               const importFromPath = getFullPath(
//                 file,
//                 el.source.value,
//                 importedFile.local.name,
//                 exportAllFiles
//               );

//               importedFiles.push({
//                 name: importedFile.local.name,
//                 path: file,
//                 el: el.source.value,
//                 importFrom: importFromPath,
//               });
//             } else if (
//               importedFile?.local.name !== importedFile?.imported?.name &&
//               importedFile?.imported?.name
//             ) {
//               const importFromPath = getFullPath(
//                 file,
//                 el.source.value,
//                 importedFile.imported.name,
//                 exportAllFiles
//               );

//               importedFiles.push({
//                 name: importedFile.imported.name,
//                 path: file,
//                 el: el.source.value,
//                 importFrom: importFromPath,
//               });
//             } else if (
//               (importedFile.type === IMPORT_NAMESPACE &&
//                 file.endsWith(".test.ts")) ||
//               file.endsWith(".test.tsx")
//             ) {
//               const importFromPath = getFullPath(
//                 file,
//                 el.source.value,
//                 importedFile.local.name,
//                 exportAllFiles
//               );

//               importedFiles.push({
//                 name: importedFile.local.name,
//                 path: file,
//                 el: el.source.value,
//                 importFrom: importFromPath,
//               });
//             } else if (
//               importedFile.type === IMPORT_NAMESPACE &&
//               !el.source.value.endsWith(".scss")
//             ) {
//               //for files .styles.ts or .styled.tsx when import *
//               const importFromPathTS =
//                 path.resolve(path.dirname(file), el.source.value) + ".ts";
//               const importFromPathTSX =
//                 path.resolve(path.dirname(file), el.source.value) + ".tsx";
//               const resultsTS = filesMap.get(importFromPathTS);
//               const resultsTSX = filesMap.get(importFromPathTSX);
//               const result = resultsTS || resultsTSX;
//               if (result) {
//                 result.forEach((variable) => {
//                   importedFiles.push({
//                     name: variable.name,
//                     path: file,
//                     el: el.source.value,
//                     importFrom: resultsTS
//                       ? importFromPathTS
//                       : importFromPathTSX,
//                   });
//                 });
//               }
//             }
//           });
//         }
//       });
//     });
//   } catch (err) {
//     console.error(err);
//   }

//   return importedFiles;
// };

// const getExportFiles = () => {
//   const importedFiles = getImportedFiles(allProjectFiles);

//   const exportedFilesWithFirstExport = exportedFiles.filter(
//     (el) => el.firstPathWithExport
//   );

//   const updatedExportedFiles = exportedFiles.filter(
//     (exportFile) =>
//       !exportedFilesWithFirstExport.some((file) => {
//         return file.name === exportFile.name && exportFile.path === file.path;
//       })
//   );

//   return exportedFiles
//     .filter(
//       (exportFile) =>
//         !importedFiles.some((importFile) => {
//           if (exportFile.name === "FUNCTIONS_NAME" && importFile.name === "FUNCTIONS_NAME") {
//             console.log("export", exportFile);
//             console.log("import", importFile);
//           }
//           return (
//             (importFile.name === exportFile.name &&
//               exportFile.isFirstExport &&
//               importFile.importFrom === exportFile.path) ||
//             (importFile.name === exportFile.name &&
//               importFile.importFrom === exportFile.path) ||
//             (importFile.name === exportFile.name &&
//               importFile.path === exportFile.path &&
//               exportFile.isFirstExport)
//           );
//         })
//     )
//     .map((file) => `${file.type ?? ""} ${file.name} in: ${file.path}`);
// };

// const searchUnusedLibraries = () => {
//   return Object.keys(package.dependencies).filter((key) => {
//     return !(USED_LIBRARIES[key] === package.dependencies[key]);
//   });
// };

// console.log(
//   "getExportFiles",
//   getExportFiles(),
//   "unused libraries",
//   searchUnusedLibraries(),
//   "length",
//   getExportFiles().length
// );
