import { formatDate as format } from "utils/format_data";
// import { FUNCTIONS_NAME } from "@func"; //вопрос по export
import { FUNCTIONS_NAME } from "./utils/functions/functions";
import { DAY } from "./constants/constants";
import { a, b } from "components/all";
import { getWorkers } from "./components";
import {
  ConnectionIdData,
  Comment,
  VIDEO_SOURCES,
  Point,
} from "./constants/interface";

import { Button } from "./components/account";

import { Last, LAST } from "./components/last";

import * as DDDDD from './components/cat';

import { TEST } from "./components/last/last";

import { User } from "./components/account/user";

import { APELSIN } from "./components/card/card";

import CAT, { DOG } from "./components/cat/cat";

console.log(DOG);
getWorkers();
const day = new Date();
console.log(FUNCTIONS_NAME);
format(day);
