const path = require("path");
const fs = require("fs");
const ts = require("typescript");
const tsESTree = require("@typescript-eslint/typescript-estree");
const config = require("./tsconfig.json");
const package = require("./package.json");

// const EXTENSIONS = ["ts", "tsx", "js"];
// const results = [];
const REGEXP_EXTENSIONS = /\.(ts|tsx|js|jsx|d\.ts)$/;
const REGEXP_INDEX_FILES =
  /(\\index\.ts|\\index\.tsx|\\index\.js|\\index\.jsx)$/gi;
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
const TYPE_DECLARATION = {
  ["TSInterfaceDeclaration"]: "Interface",
  ["TSEnumDeclaration"]: "Enum",
  ["TSTypeAliasDeclaration"]: "Type",
};

const UNUSED_LIBRARIES = {};

const filesMap = new Map();
//TODO: refactoring here
const fn = (obj1, obj2) => {
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
  if (filesMap.get(file)) {
    const result = filesMap.get(file);
    const res = fn(result.from, object.from);

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
  if (file.endsWith(".ts") || file.endsWith(".js")) {
    const data = fs.readFileSync(file, CHARACTER_ENCODING);
    return tsESTree.parse(data);
  }

  if (file.endsWith(".tsx") || file.endsWith(".jsx")) {
    const data = fs.readFileSync(file, CHARACTER_ENCODING);
    return tsESTree.parse(data, { jsx: true });
  }
};

const getFiles = () => {
  const files = [rootPath];
  const results = [];

  while (files.length) {
    const currentPath = files.shift();

    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((file) => {
      if (file.isFile() && REGEXP_EXTENSIONS.test(file.name)) {
        const fullPath = path.resolve(currentPath, file.name);
        handleVariablesInFile(fullPath, {
          ownExport: [],
          children: [],
          from: {},
        });
        results.push(fullPath);
      } else if (file.isDirectory()) {
        files.push(path.resolve(currentPath, file.name));
      }
    });
  }
  //will return the array of strings where string is a full path for every single file in the project
  return results;
};

const allProjectFiles = getFiles();

const defineFullPathForFile = (filesPath, allFiles) => {
  let currentPathFrom = "",
    i = 0;
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

  while (!currentPathFrom && i < ALL_EXTENSIONS.length) {
    const [result] = allFiles.filter((file) =>
      file.includes(`${filesPath}${ALL_EXTENSIONS[i]}`)
    );
    if (result) {
      currentPathFrom = result;
    }
    i++;
  }

  return currentPathFrom;
};

const defineNameOfImportedVariable = (importedFile) => {
  let name = "";
  //   el.specifiers.forEach((importedFile) => {
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
  //   });
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

    program.body.forEach((element) => {
      let pathFrom = element?.source?.value,
        filesPath = "";

      if (pathFrom?.startsWith("~")) {
        pathFrom = element.source?.value.replace(/(~\/)/gi, "");
        filesPath = path.resolve(rootPath, pathFrom);
      }

      if (element.type.startsWith(EXPORT) && element.type === EXPORT_ALL) {
        if (!filesPath) {
          filesPath = path.resolve(path.dirname(file), pathFrom);
        }
        const absoluteFilesPath = defineFullPathForFile(
          filesPath,
          allProjectFiles
        );
        handleVariablesInFile(file, {
          ownExport: [],
          children: [absoluteFilesPath],
          from: {},
        });
      } else if (
        element.type.startsWith(EXPORT) &&
        element.type !== EXPORT_ALL &&
        !pathFrom
      ) {
        const name = defineNameOfExportedVariable(element);
        handleVariablesInFile(file, {
          ownExport: [
            {
              type: element.type,
              name,
              isVerified: false,
              isFirstExport: true,
            },
          ],
          children: [],
          from: {},
        });
      } else if (
        element.type.startsWith(EXPORT) &&
        element.type !== EXPORT_ALL &&
        pathFrom
      ) {
        //TODO: fix this moment
        const absoluteFilesPath = defineFullPathForFile(
          filesPath,
          allProjectFiles
        );

        element.specifiers.forEach((exportedFile) => {
          //TODO: if my export has a path from was export
          // const name = defineNameOfExportedVariable(element);
          handleVariablesInFile(file, {
            ownExport: [],
            children: [absoluteFilesPath],
            // from: { [absoluteFilesPath]: [{ name, type: exportedFile.type }] },
            from: {},
          });
        });
      } else if (
        element.type.startsWith(IMPORT) &&
        !pathFrom?.endsWith(".scss")
      ) {
        if (!filesPath) {
          filesPath = path.resolve(path.dirname(file), pathFrom);
        }
        //TODO: '~/../test-utils/data' ????
        element.specifiers.forEach((importedFile) => {
          const absoluteFilesPath = defineFullPathForFile(
            filesPath,
            allProjectFiles
          );
          const name = defineNameOfImportedVariable(importedFile);
          handleVariablesInFile(file, {
            ownExport: [],
            children: [],
            from: { [absoluteFilesPath]: [{ name, type: importedFile.type }] },
          });
        });
      }
    });
  });

  // return filesMap;
};

const getExportFiles = () => {
  //"C:\\Users\\hanna.yermakovich\\Desktop\\PARSE\\find-unused-data\\src\\components\\account\\index.ts"
  //"C:\\Users\\hanna.yermakovich\\Desktop\\PARSE\\find-unused-data\\src\\index.ts"
  ["C:\\Users\\hanna.yermakovich\\Desktop\\PARSE\\find-unused-data\\src\\index.ts"].forEach((file) => {
    const data = filesMap.get(file);
    const result = Object.entries(data.from);
    //TODO: what with this function
    const findRootExportFile = (file, arrWithResult, arr) => {
      const arrWithOwnExport = [...arr];
      const updatedData = arrWithResult.ownExport.map((importedProp) => {
        return arrWithOwnExport.some(
          (prop) => importedProp.name === prop.name && !importedProp.isVerified
        )
          ? { ...importedProp, isVerified: true }
          : importedProp;
      });
      filesMap.set(file, {
        children: [...arrWithResult.children],
        ownExport: updatedData,
        from: { ...arrWithResult.from },
      });
      const withExtraExport = arrWithOwnExport.filter((variable) => {
        return updatedData.some(
          (updatedVariable) =>
            updatedVariable.name === variable.name &&
            !updatedVariable.isVerified
        );
      });
      // console.log('arrWithOwnExport', arrWithOwnExport)
      // console.log('arrWithResult', arrWithResult)
      // console.log("updatedData", updatedData);
      // console.log("withExtraExport", withExtraExport);
    };

    if (result.length) {
      result.forEach(([path, ownProperties]) => {
        console.log('path', path)
        console.log('ownProperties', ownProperties)
        //TODO: ownProperties include only imported files ({name, type??})
        //TODO: refactoring code
        //TODO: this path should be deleted later when we add package.json
        if (path) {
          const fileFromDidExport = filesMap.get(path);
          const allExportInFile = fileFromDidExport.ownExport;
          //TODO: but what is ownExport don't include

          ownProperties.forEach((prop) => {
            
          })

          //'C:\\Users\\hanna.yermakovich\\Desktop\\PARSE\\find-unused-data\\src\\components\\account\\index.ts'
          if (allExportInFile.length) {
            //TODO: ??????????
            findRootExportFile(path, fileFromDidExport, ownProperties);
          } else {
            filesMap.get(path).children.forEach((file) => {
              const result = filesMap.get(file);

              if (result.ownExport.length) {
                findRootExportFile(file, result, ownProperties);
              }
            });
          }
        }
      });
    }
  });

  for (let [key, value] of filesMap) {
    value.ownExport.forEach((variable) => {
      if (!variable.isVerified) {
        // console.log(`${variable.name} in ${key}`);
      }
    });
  }

  //   return filesMap;
};

const searchUnusedLibraries = () => {
  return Object.keys(package.dependencies).filter((key) => {
    return !(UNUSED_LIBRARIES[key] === package.dependencies[key]);
  });
};

console.log(
  "getExportFiles",
  handleFiles(),
  "unused libraries",
  //   searchUnusedLibraries(),
  "length",
  getExportFiles()
);

console.log(
  "!!!!",
  filesMap.get(
    "C:\\Users\\hanna.yermakovich\\Desktop\\PARSE\\find-unused-data\\src\\components\\account\\index.ts"
  ).from
);
