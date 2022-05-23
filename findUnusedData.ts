const path = require("path");
const fs = require("fs");
const ts = require("typescript");
const tsESTree = require("@typescript-eslint/typescript-estree");
const config = require("./tsconfig.json");

// const EXTENSIONS = ["ts", "tsx", "js"];
// const results = [];
const REGEXP_EXTENSIONS = /\.(ts|tsx|js|jsx)$/;
const REGEXP_INDEX_FILES =
  /(\\index\.ts|\\index\.tsx|\\index\.js|\\index\.jsx)$/gi;
const REGEXP_START_STRING = /(^\.\/|^\.\.\/)/gi;
const rootPath = path.resolve("src");
const CHARACTER_ENCODING = "utf8";
const EXPORT = "Export";
const IMPORT = "Import";
const EXPORT_ALL = "ExportAllDeclaration";
const TYPE_DECLARATION = "TSTypeAliasDeclaration";
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
  //will return the array of strings where string is a full path for every single file in the project
  return results;
};

const getExportAllFiles = (allProjectFiles) => {
  const exportAllFiles = [];

  allProjectFiles.forEach((file) => {
    const data = fs.readFileSync(file, CHARACTER_ENCODING);
    const program = tsESTree.parse(data, { jsx: true });

    program.body.forEach((el) => {
      if (el.type === EXPORT_ALL) {
        const exportAllFromPath = path.resolve(
          path.dirname(file),
          el.source.value
        );
        const [pathWithAllImport] = allProjectFiles.filter(
          (path) => path.indexOf(exportAllFromPath) !== -1
        );
        exportAllFiles.push({
          exportAllFromPath: pathWithAllImport,
        });
      }
    });
  });

  return exportAllFiles;
};

const handleExportedFileWithDeclaration = (el, filePath) => {
  const exportedFiles = [];

  if (el?.declaration?.name) {
    //for React component
    exportedFiles.push({
      name: el.declaration.name,
      path: filePath,
      isFirstExport: !el?.source?.value,
    });
  } else if (el?.declaration?.id?.name) {
    //for functions declaration, for Classes
    exportedFiles.push({
      name: el.declaration.id.name,
      path: filePath,
      isFirstExport: !el?.source?.value,
    });
  } else if (el?.declaration?.declarations) {
    // for multiple export. also for constants
    // example: export const one, two, three.
    // export const NAME = 'Eva' or export const MONTH = ['Jan', 'Feb', 'Mar']
    el.declaration.declarations.forEach((exportedFile) => {
      exportedFiles.push({
        name: exportedFile.id.name,
        path: filePath,
        isFirstExport: !el?.source?.value,
      });
    });
  }

  return exportedFiles;
};

const handleExportedFileWithSpecifiers = (el, file) => {
  const exportedFiles = [];

  el.specifiers.forEach((exportedFile) => {
    const firstPathWithExport = el?.source?.value
      ? path.resolve(path.dirname(file), el.source.value)
      : "";
    const sourceValue = el?.source?.value.replace(REGEXP_START_STRING, "");

    if (exportedFile.local.name === exportedFile.exported.name) {
      //for multiple export. example: export { sayHi, sayBuy }
      exportedFiles.push({
        name: exportedFile.local.name,
        path: file,
        sourceValue,
        isFirstExport: !el?.source?.value,
        firstPathWithExport: firstPathWithExport,
      });
    } else if (exportedFile.exported.name === DEFAULT) {
      // for variable when we do export as default. example: export { name as default }
      exportedFiles.push({
        name: exportedFile.local.name,
        path: file,
        sourceValue,
        isFirstExport: !el?.source?.value,
        firstPathWithExport: firstPathWithExport,
      });
    } else {
      // when we change name for variable. example: export { name as name1 };
      exportedFiles.push({
        name: exportedFile.exported.name,
        path: file,
        sourceValue,
        isFirstExport: !el?.source?.value,
        firstPathWithExport: firstPathWithExport,
      });
    }
  });

  return exportedFiles;
};

const getExportedFiles = (allProjectFiles) => {
  const exportedFiles = [];
  //do we need try/catch here?
  try {
    allProjectFiles.forEach((file) => {
      const data = fs.readFileSync(file, CHARACTER_ENCODING);
      const program = tsESTree.parse(data, { jsx: true });

      program.body.forEach((el) => {
        if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.DECLARATION]) {
          const results = handleExportedFileWithDeclaration(el, file);

          exportedFiles.push(...results);
        } else if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.SPECIFIERS]) {
          const results = handleExportedFileWithSpecifiers(el, file);

          exportedFiles.push(...results);
        }

        if (el.type === TYPE_DECLARATION) {
          exportedFiles.push({
            name: el.id.name,
            path: file,
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
  }

  return exportedFiles;
};

const getImportedFiles = (allProjectFiles) => {
  const importedFiles = [];
  const exportedFiles = getExportedFiles(allProjectFiles);
  const exportAllFiles = getExportAllFiles(allProjectFiles);

  let tsconfigOptionsPaths = config?.compilerOptions?.paths;
  const tsconfigOptionsBaseUrl = config?.compilerOptions?.baseUrl;

  try {
    allProjectFiles.forEach((file) => {
      const data = fs.readFileSync(file, CHARACTER_ENCODING);
      const program = tsESTree.parse(data, { jsx: true });
      const filesWithSeveralExports = exportedFiles.filter(
        (el) => el.isFirstExport === false
      );

      program.body.forEach((el) => {
        if (el.type.startsWith(IMPORT) && el?.source?.value) {
          let importFromPath = path.resolve(
            path.dirname(file),
            el.source.value
          );

          const isStartsWithDot =
            el?.source?.value.startsWith("./") ||
            el?.source?.value.startsWith("../");
          // const isStartsWithDot = REGEXP_START_STRING.test(el?.source?.value);

          let pathFromTsconfigPaths =
            tsconfigOptionsPaths?.[`${el?.source?.value}`];

          //if was import from file where was export from another file
          filesWithSeveralExports.forEach((el) => {
            if (importFromPath.endsWith(el.sourceValue)) {
              importFromPath = el.path;
            }
          });

          //to check if it is an absolute path or not
          if (
            tsconfigOptionsBaseUrl &&
            !isStartsWithDot &&
            !pathFromTsconfigPaths
          ) {
            importFromPath = path.resolve(rootPath, el.source.value);
          }

          //if our import uses tsconfig path then we will replace the path
          if (pathFromTsconfigPaths) {
            importFromPath = path.resolve(
              path.dirname(file),
              pathFromTsconfigPaths[0]
            );
          }

          //to replace path of the import file if it is importing from all export
          if (exportAllFiles.length) {
            exportAllFiles.forEach((el) => {
              if (el.exportAllFromPath.indexOf(importFromPath) !== -1) {
                importFromPath = el.exportAllFromPath;
              }
            });
          }

          //if our path look like
          //tsconfig {compilerOptions: {paths: {"last/*": ["components/last/*"]}}}
          if (tsconfigOptionsPaths && !isStartsWithDot) {
            const REGEXP = /.+?(?=\/)/;
            const keyInPaths =
              tsconfigOptionsPaths[el.source.value.match(REGEXP) + "/*"];
            if (keyInPaths) {
              const indexOfSymbol = el.source.value.indexOf("/");
              const nameOfPath = el.source.value.slice(indexOfSymbol + 1);
              const pathFrom = path.resolve(
                rootPath,
                keyInPaths[0].replace(/(\/\*|\/\*\*)$/gi, "")
              );
              importFromPath = path.resolve(pathFrom, nameOfPath);
            }
          }

          el.specifiers.forEach((importedFile) => {
            if (
              importedFile.local.name &&
              !importedFile[OWN_PROPERTY.IMPORTED]
            ) {
              importedFiles.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
              });
            } else if (importedFile.local.name === importedFile.imported.name) {
              importedFiles.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
              });
            } else if (importedFile.local.name !== importedFile.imported.name) {
              importedFiles.push({
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

  return importedFiles;
};

const getExportFiles = () => {
  const allProjectFiles = getFiles();
  const exportedFiles = getExportedFiles(allProjectFiles);
  const importedFiles = getImportedFiles(allProjectFiles);

  const exportedFilesWithFirstExport = exportedFiles.filter(
    (el) => el.firstPathWithExport
  );

  const updatedExportedFiles = exportedFiles.filter(
    (exportFile) =>
      !exportedFilesWithFirstExport.some((file) => {
        return (
          file.name === exportFile.name &&
          exportFile.path.indexOf(file.firstPathWithExport) !== -1
        );
      })
  );

  return updatedExportedFiles
    .filter(
      (exportFile) =>
        !importedFiles.some((importFile) => {
          return (
            importFile.name === exportFile.name &&
            (exportFile.path.replace(REGEXP_EXTENSIONS, "") ===
              importFile.importFrom ||
              exportFile.path === importFile.importFrom ||
              exportFile.path.replace(REGEXP_INDEX_FILES, "") ===
                importFile.importFrom ||
              (exportFile.isFirstExport === true &&
                exportFile.path === importFile.path))
          );
        })
    )
    .map((file) => `${file.name} in: ${file.path}`);
};

console.log("getExportFiles", getExportFiles());
