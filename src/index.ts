import { formatDate as format } from "utils/format_data";
import { FUNCTIONS_NAME } from "func"; //вопрос по export
import { DAY } from "./constants/constants";
import { a, b } from "components/all";
import { getWorkers } from "./components";
import { ConnectionIdData, Comment, VIDEO_SOURCES } from './constants/interface';

getWorkers();
const day = new Date();
console.log(FUNCTIONS_NAME);
format(day);
