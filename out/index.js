import { formatDate as format } from "utils/format_data";
import { FUNCTIONS_NAME } from "@func"; //вопрос по export
import { getWorkers } from "./components";
getWorkers();
const day = new Date();
console.log(FUNCTIONS_NAME);
format(day);
