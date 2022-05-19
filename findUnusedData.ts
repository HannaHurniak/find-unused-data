const path = require("path");
const fs = require("fs");
const ts = require("typescript");
const tsESTree = require("@typescript-eslint/typescript-estree");
const config = require("./tsconfig.json");

// const EXTENSIONS = ["ts", "tsx", "js"];
// const results = [];
const REGEXP_EXTENSIONS = /\.(ts|tsx|js)$/;
const rootPath = path.resolve("src");

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

  return results;
};

const getExportFiles = () => {
  const importFileNames = [];
  const exportFileNames = [];
  const tsconfigOptionsPaths = config?.compilerOptions?.paths;
  const tsconfigOptionsBaseUrl = config?.compilerOptions?.baseUrl;
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
        const [pathWithAllImport] = allFiles.filter(
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
        const exportedFileFromPath = file;

        if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.DECLARATION]) {
          if (el?.declaration?.name) {
            exportFileNames.push({
              name: el.declaration.name,
              path: exportedFileFromPath,
              sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
              isFirstExport: el?.source?.value ? false : true,
            });
          } else if (el?.declaration?.id?.name) {
            exportFileNames.push({
              name: el.declaration.id.name,
              path: exportedFileFromPath,
              sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
              isFirstExport: el?.source?.value ? false : true,
            });
          } else if (el?.id?.name) {
            exportFileNames.push({
              name: el.id.name,
              path: exportedFileFromPath,
              sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
              isFirstExport: el?.source?.value ? false : true,
            });
          } else if (el?.declaration?.declarations) {
            el.declaration.declarations.forEach((exportedFile) => {
              exportFileNames.push({
                name: exportedFile.id.name,
                path: exportedFileFromPath,
                sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
                isFirstExport: el?.source?.value ? false : true,
              });
            });
          }
        }

        if (el.type.startsWith(EXPORT) && el[OWN_PROPERTY.SPECIFIERS]) {
          el.specifiers.forEach((exportedFile) => {
            const firstPathWithExport = el?.source?.value
              ? path.resolve(
                  path.dirname(exportedFileFromPath),
                  el.source.value
                )
              : "";
            if (exportedFile.local.name === exportedFile.exported.name) {
              exportFileNames.push({
                name: exportedFile.local.name,
                path: exportedFileFromPath,
                sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
                isFirstExport: el?.source?.value ? false : true,
                firstPathWithExport: firstPathWithExport,
              });
            } else if (exportedFile.exported.name === DEFAULT) {
              exportFileNames.push({
                name: exportedFile.local.name,
                path: exportedFileFromPath,
                sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
                isFirstExport: el?.source?.value ? false : true,
                firstPathWithExport: firstPathWithExport,
              });
            } else {
              exportFileNames.push({
                name: exportedFile.exported.name,
                path: exportedFileFromPath,
                sourceValue: el?.source?.value.replace(/(\.\/|\.\.\/)/gi, ""),
                isFirstExport: el?.source?.value ? false : true,
                firstPathWithExport: firstPathWithExport,
              });
            }
          });
        }

        if (el.type === TYPE_DECLARATION) {
          exportFileNames.push({
            name: el.id.name,
            path: exportedFileFromPath,
          });
        }
      });
    });

    allFiles.forEach((file) => {
      const data = fs.readFileSync(file, "utf8");
      const program = tsESTree.parse(data, { jsx: true });
      const res = exportFileNames.filter((el) => el.isFirstExport === false);

      program.body.forEach((el) => {
        if (el.type.startsWith(IMPORT) && el?.source?.value) {
          let importFromPath = path.resolve(
            path.dirname(file),
            el.source.value
          );

          const pathFromTsconfigPaths =
            tsconfigOptionsPaths?.[`${el.source.value}`];
          const isStartsWith =
            el?.source?.value.startsWith("./") ||
            el?.source?.value.startsWith("../");

          //if was import from file where was export from another file
          res.forEach((el) => {
            if (importFromPath.endsWith(el.sourceValue)) {
              importFromPath = el.path;
            }
          });

          //to check if it is an absolute path or not
          if (
            tsconfigOptionsBaseUrl &&
            !isStartsWith &&
            !pathFromTsconfigPaths
          ) {
            importFromPath = path.resolve(rootPath, el.source.value);
          }

          //if our import is using tsconfig path then here we will replace the path
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
              !importedFile[OWN_PROPERTY.IMPORTED]
            ) {
              importFileNames.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
                el: el.source.value,
              });
            } else if (importedFile.local.name === importedFile.imported.name) {
              importFileNames.push({
                name: importedFile.local.name,
                path: file,
                importFrom: importFromPath,
                el: el.source.value,
              });
            } else if (importedFile.local.name !== importedFile.imported.name) {
              importFileNames.push({
                name: importedFile.imported.name,
                path: file,
                importFrom: importFromPath,
                el: el.source.value,
              });
            }
          });
        }

        //for type typescript
        // if (el.type.startsWith(IMPORT) && !el?.source?.value) {
        //   importFileNames.push({
        //     name: el.local.name,
        //     path: file,
        //     importFrom: file,
        //   });
        // }
      });
    });
  } catch (err) {
    console.error(err);
  }

  // const updatedImportFiles = importFileNames.map((importFile) => {
  //   const res = exportFileNames.filter(
  //     (exportFile) =>
  //       exportFile.path.indexOf(importFile.importFrom) !== -1 &&
  //       importFile.name === exportFile.name
  //   );
  //   if (!res.length) {
  //     return importFile;
  //   } else {
  //     return {
  //       ...importFile,
  //       rootExportPath: res[0].firstPathWithExport,
  //     };
  //   }
  // });
  // console.log("importFileNames", exportFileNames);
  // console.log('updatedImportFiles', updatedImportFiles)

  const exportedFilesWithFirstPath = exportFileNames.filter(
    (el) => el.firstPathWithExport
  );
  // console.log("exportedFilesWithFirstPath", exportedFilesWithFirstPath);
  const updatedExportedFiles = exportFileNames.filter(
    (exportFile) =>
      !exportedFilesWithFirstPath.some((file) => {
        return (
          file.name === exportFile.name &&
          exportFile.path.indexOf(file.firstPathWithExport) !== -1
        );
      })
  );
  // console.log('updatedExportedFiles', updatedExportedFiles)
  return updatedExportedFiles
    .filter(
      (exportFile) =>
        !importFileNames.some((importFile) => {
          return (
            importFile.name === exportFile.name &&
            (exportFile.path.replace(/(.ts|.tsx)$/gi, "") ===
              importFile.importFrom ||
              exportFile.path === importFile.importFrom ||
              exportFile.path.replace(/(\\index\.ts|\\index\.tsx)/gi, "") ===
                importFile.importFrom)
          );
        })
    )
    .map((file) => `${file.name} in: ${file.path}`);
};

console.log("getExportFiles", getExportFiles());
