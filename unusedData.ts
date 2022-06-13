const path = require("path");
const fs = require("fs");
const ts = require("typescript");
const tsESTree = require("@typescript-eslint/typescript-estree");
const config = require("./tsconfig.json");
const package = require("./package.json");

const REGEXP_EXTENSIONS = /\.(ts|tsx|js|jsx|d\.ts)$/;
const REGEXP_START_STRING = /(^\.\/|^\.\.\/)/gi;
const rootPath = path.resolve("src");
const CHARACTER_ENCODING = "utf8";
const EXPORT = "Export";
const IMPORT = "Import";
const IMPORT_NAMESPACE = "ImportNamespaceSpecifier";
const EXPORT_ALL = "ExportAllDeclaration";
const DEFAULT = "default";
const OWN_PROPERTY = {
  DECLARATION: "declaration",
  SPECIFIERS: "specifiers",
  IMPORTED: "imported",
};

const UNUSED_LIBRARIES = package.dependencies;

const filesMap = new Map();

//TODO: refactoring here
const updateImportedFiles = (obj1, obj2) => {
  return Object.keys(obj2).reduce(
    (prevValue, key) => {
      if (prevValue[key]) {
        prevValue[key] = [...prevValue[key], ...obj2[key]];
      } else {
        prevValue[key] = obj2[key];
      }
      return prevValue;
    },
    { ...obj1 }
  );
};

const handleVariablesInFile = (file, object) => {
  const result = filesMap.get(file);
  //TODO:
  if (result) {
    const res = updateImportedFiles(result.from, object.from);

    filesMap.set(file, {
      children: result.children?.concat(object.children),
      ownExport: result.ownExport?.concat(object.ownExport),
      from: res,
    });
  } else {
    filesMap.set(file, object);
  }
};

const getProgram = (file) => {
  const data = fs.readFileSync(file, CHARACTER_ENCODING);
  return tsESTree.parse(data, {
    jsx: file.endsWith(".tsx") || file.endsWith(".jsx") ? true : false,
  });
};

const getFiles = () => {
  const files = [rootPath];
  const results = [];

  while (files.length) {
    const currentPath = files.shift();

    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((file) => {
      if (file.isFile() && REGEXP_EXTENSIONS.test(file.name)) {
        const fullPath = path.resolve(currentPath, file.name);

        results.push(fullPath);
      } else if (file.isDirectory()) {
        files.push(path.resolve(currentPath, file.name));
      }
    });
  }
  //will return the array of strings where string is a full path for every single file in the project
  return results;
};

const t1 = performance.now();
const allProjectFiles = getFiles();

const getFullPathForFile = (filesPath, allFiles) => {
  let currentPathFrom = "";
  const ALL_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".d.ts",
    "\\index.ts",
    "\\index.tsx",
    "\\index.js",
    "\\index.jsx",
  ];

  for (let i = 0; i < ALL_EXTENSIONS.length; i++) {
    const result = allFiles.find(
      (file) => file === `${filesPath}${ALL_EXTENSIONS[i]}`
    );
    if (result) {
      currentPathFrom = result;
      break;
    }
  }

  return currentPathFrom;
};

const defineNameOfImportedVariable = (importedFile) => {
  let name = "";
  if (
    importedFile.local.name &&
    !importedFile[OWN_PROPERTY.IMPORTED] &&
    importedFile.type !== IMPORT_NAMESPACE
  ) {
    name = importedFile.local.name;
  } else if (importedFile?.local?.name === importedFile?.imported?.name) {
    name = importedFile.local.name;
  } else if (
    importedFile?.local.name !== importedFile?.imported?.name &&
    importedFile?.imported?.name
  ) {
    name = importedFile.imported.name;
  }
  return name;
};

const defineNameOfExportedVariable = (el) => {
  let name = "name";
  if (el.specifiers?.length) {
    el.specifiers.forEach((exportedFile) => {
      //export { default as Button } from './acc';
      if (exportedFile.local.name === exportedFile.exported.name) {
        //for multiple export. example: export { sayHi, sayBuy }
        name = exportedFile.local.name;
      } else if (exportedFile.exported.name === DEFAULT) {
        // for variable when we do export as default. example: export { name as default }
        name = exportedFile.local.name;
      } else {
        // when we change name for variable. example: export { name as name1 };
        name = exportedFile.exported.name;
      }
    });
  } else {
    if (el?.declaration?.name) {
      //for React component
      name = el.declaration.name;
    } else if (el?.declaration?.id?.name) {
      //for functions declaration, for Classes, for Interface
      name = el.declaration.id.name;
    } else if (el?.declaration?.declarations) {
      // for multiple export. also for constants
      // example: export const one, two, three.
      // export const NAME = 'Eva' or export const MONTH = ['Jan', 'Feb', 'Mar']

      el.declaration.declarations.forEach((exportedFile) => {
        name = exportedFile.id.name;
      });
    }
  }

  return name;
};

const handleFiles = () => {
  allProjectFiles.forEach((file) => {
    const program = getProgram(file);

    // if (file.includes("AppRoutes.tsx")) {
    //   program.body.forEach((node) => {
    //     tsESTree.simpleTraverse(node, {
    //       enter: (node) => {
    //         if (node.type.startsWith(IMPORT)) {
    //           console.log('node', node)
    //         }
    //       },
    //     });
    //   });
    // }

    const ownExport = [];
    const children = [];
    const from = {};

    program.body.forEach((element) => {
      let pathFrom = element?.source?.value,
        filesPath = "";

      if (pathFrom?.startsWith("~")) {
        pathFrom = element.source?.value.slice(2);
        filesPath = path.resolve(rootPath, pathFrom);
      }

      if (element.type.startsWith(EXPORT) && element.type === EXPORT_ALL) {
        if (!filesPath) {
          filesPath = path.resolve(path.dirname(file), pathFrom);
        }
        const absoluteFilesPath = getFullPathForFile(
          filesPath,
          allProjectFiles
        );

        children.push(absoluteFilesPath);
      } else if (
        element.type.startsWith(EXPORT) &&
        element.type !== EXPORT_ALL &&
        !pathFrom
      ) {
        const name = defineNameOfExportedVariable(element);

        ownExport.push({
          type: element.type,
          name,
        });
      } else if (
        element.type.startsWith(EXPORT) &&
        element.type !== EXPORT_ALL &&
        pathFrom
      ) {
        filesPath = path.resolve(path.dirname(file), pathFrom);
        const absoluteFilesPath = getFullPathForFile(
          filesPath,
          allProjectFiles
        );

        children.push(absoluteFilesPath);
      } else if (
        element.type.startsWith(IMPORT) &&
        !pathFrom?.endsWith(".scss")
      ) {
        // const REGEXP = /.+?(?=\/)/;
        // const [aaa] = pathFrom?.match(REGEXP);
        // const ccc = aaa || pathFrom
        if (UNUSED_LIBRARIES[pathFrom]) {
          delete UNUSED_LIBRARIES[pathFrom];
          return;
        }

        if (!filesPath) {
          filesPath = path.resolve(path.dirname(file), pathFrom);
        }
        //TODO: '~/../test-utils/data' ????
        element.specifiers.forEach((importedFile) => {
          //TODO: create 2 ways for import
          const absoluteFilesPath = getFullPathForFile(
            filesPath,
            allProjectFiles
          );
          //TODO: name of all import and func
          const name = defineNameOfImportedVariable(importedFile);
          const dataOfImportedFile = from[absoluteFilesPath];
          if (dataOfImportedFile) {
            from[absoluteFilesPath] = [...dataOfImportedFile, { name, type: importedFile.type }];
          } else {
            from[absoluteFilesPath] = [{ name, type: importedFile.type }];
          }
          //TODO: delete
        });
      }
    });
    handleVariablesInFile(file, {
      ownExport,
      children,
      from,
    });
  });
};

const getExportFiles = () => {
  const filePathsForHandling = Array.from(filesMap.keys());

  filePathsForHandling.forEach((file) => {
    const data = filesMap.get(file);
    const result = Object.entries(data.from);
    //TODO: what with this function

    // const handleAllImportFiles = (path, variable) => {
    //   const fileFromDidExport = filesMap.get(path);
    //   filesMap.set(path, {
    //     ...fileFromDidExport,
    //     ownExport: [],
    //   });
    // }

    const updateDataOfOwnExport = (path, variable) => {
      if (!path) return;
      //TODO: refactoring
      //TODO: handle separated styles
      if (variable.type === IMPORT_NAMESPACE) {
        const fileFromDidExport = filesMap.get(path);
        filesMap.set(path, {
          ...fileFromDidExport,
          ownExport: [],
        });
      }

      const fileFromDidExport = filesMap.get(path);
      const allExportInFile = fileFromDidExport.ownExport;
      const exportedVariable = allExportInFile.find((prop) => prop.name === variable.name);

      if (exportedVariable) {
        const updatedData = allExportInFile.filter(
          (importedProp) => importedProp.name !== exportedVariable.name
        );

        filesMap.set(path, {
          ...fileFromDidExport,
          ownExport: updatedData,
        });
      } else {
        fileFromDidExport.children.forEach((child) => {
          updateDataOfOwnExport(child, variable);
        });
      }
    };

    if (result.length) {
      result.forEach(([path, ownProperties]) => {
          ownProperties.forEach((variable) => {
            updateDataOfOwnExport(path, variable);
          });
      });
    }
  });

  const UNUSED = [];

  for (let [key, value] of filesMap) {
    value.ownExport.forEach((variable) => {
      UNUSED.push(`${variable.name} in ${key}`);
    });
  }

  return UNUSED;
};

console.log(
  "getExportFiles",
  handleFiles(),
  "unused libraries",
  UNUSED_LIBRARIES,
  "length",
  getExportFiles(),
  getExportFiles().length
);
const t2 = performance.now();

console.log("time", t2 - t1);
