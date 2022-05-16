const path = require("path");
const fs = require("fs");
const ts = require("typescript");
const tsESTree = require("@typescript-eslint/typescript-estree");
const config = require("./tsconfig.json");

// const EXTENSIONS = ["ts", "tsx", "js"];
// const results = [];
const REGEXP_EXTENSIONS = /\.(ts|tsx|js)$/;
let rootPath = path.resolve("src");

const EXPORT = "Export";
const IMPORT = "Import";
const EXPORT_ALL = "ExportAllDeclaration";
const DEFAULT = "default";
const OWN_PROPERTY = {
  DECLARATION: "declaration",
  SPECIFIERS: "specifiers",
  IMPORTED: "imported",
};

const getFiles = () => {
  const files = [rootPath];
  const results = [];

  while (files.length) {
    const currentPath = files.shift();
    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((file) => {
      if (file.isFile() && REGEXP_EXTENSIONS.test(file.name)) {
        results.push(path.resolve(currentPath, file.name));
      } else if (file.isDirectory()) {
        files.push(path.resolve(currentPath, file.name));
      }
    });
  }

  return results;
};

const getExportFiles = () => {
  const importFileNames = [];
  const exportFileNames = [];
  const tsconfigOptionsPaths = config.compilerOptions.paths;
  const allFiles = getFiles();

  const exportAllFiles = [];

  allFiles.forEach((file) => {
    const data = fs.readFileSync(file, "utf8");

    const program = tsESTree.parse(data, { jsx: true });

    program.body.forEach((el) => {
      if (el.type === EXPORT_ALL) {
        const exportAllFromPath = path.resolve(
          path.dirname(file),
          el.source.value
        );
        const [ pathWithAllImport ] = allFiles.filter(
          (path) => path.indexOf(exportAllFromPath) !== -1
        );
        exportAllFiles.push({
          pathWhereAllExport: file,
          pathFromAllExport: pathWithAllImport,
        });
      }
    });
  });

  try {
    allFiles.forEach((file) => {
      const data = fs.readFileSync(file, "utf8");

      const program = tsESTree.parse(data, { jsx: true });

      program.body.forEach((el) => {
        if (
          el.type.startsWith(EXPORT) &&
          el.hasOwnProperty(OWN_PROPERTY.DECLARATION)
        ) {
          if (el?.declaration?.name) {
            exportFileNames.push({
              name: el.declaration.name,
              path: file,
            });
          } else if (el?.declaration?.id?.name) {
            exportFileNames.push({
              name: el.declaration.id.name,
              path: file,
            });
          } else if (el?.id?.name) {
            exportFileNames.push({
              name: el.id.name,
              path: file,
            });
          } else if (el?.declaration?.declarations) {
            el.declaration.declarations.forEach((exportedFile) => {
              exportFileNames.push({
                name: exportedFile.id.name,
                path: file,
              });
            });
          }
        }

        if (
          el.type.startsWith(EXPORT) &&
          el.hasOwnProperty(OWN_PROPERTY.SPECIFIERS)
        ) {
          el.specifiers.forEach((exportedFile) => {
            if (exportedFile.local.name === exportedFile.exported.name) {
              exportFileNames.push({
                name: exportedFile.local.name,
                path: file,
              });
            } else if (exportedFile.exported.name === DEFAULT) {
              exportFileNames.push({
                name: exportedFile.local.name,
                path: file,
              });
            } else {
              exportFileNames.push({
                name: exportedFile.exported.name,
                path: file,
              });
            }
          });
        }

        if (el.type.startsWith(IMPORT) && el?.source?.value) {
          let importFromPath = path.resolve(
            path.dirname(file),
            el.source.value
          );

          //if our import is using tsconfig path then here we will replace the path
          const pathFromTsconfigPaths =
            tsconfigOptionsPaths[`${el.source.value}`];
          if (pathFromTsconfigPaths) {
            importFromPath = path.resolve(
              path.dirname(file),
              pathFromTsconfigPaths[0]
            );
          }

          //here we replace path of the import file if it is importing from all export
          if (exportAllFiles.length) {
            exportAllFiles.forEach((el) => {
              if (el.pathFromAllExport.indexOf(importFromPath) !== -1) {
                importFromPath = el.pathFromAllExport;
              }
            });
          }

          el.specifiers.forEach((importedFile) => {
            if (
              importedFile.local.name &&
              !importedFile.hasOwnProperty(OWN_PROPERTY.IMPORTED)
            ) {
              importFileNames.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
              });
            } else if (importedFile.local.name === importedFile.imported.name) {
              importFileNames.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
              });
            } else if (importedFile.local.name !== importedFile.imported.name) {
              importFileNames.push({
                name: importedFile.imported.name,
                path: file,
                importFrom: importFromPath,
              });
            }
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
  // console.log(exportFileNames);
  // console.log(importFileNames);
  return exportFileNames
    .filter(
      (exportFile) =>
        !importFileNames.some((importFile) => {
          return (
            importFile.name === exportFile.name &&
            (exportFile.path.replace(/(.ts|.tsx)$/gi, "") ===
              importFile.importFrom ||
              exportFile.path === importFile.importFrom)
          );
        })
    )
    .map((file) => `${file.name} in: ${file.path}`);
};

console.log("getExportFiles", getExportFiles());
