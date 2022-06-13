import { formatDate as format } from "utils/format_data";
// import { FUNCTIONS_NAME } from "@func"; //вопрос по export
import { FUNCTIONS_NAME } from "./utils/functions/functions";
import { getWorkers } from "./components";
import { DOG } from "./components/cat/cat";
console.log(DOG);
getWorkers();
const day = new Date();
console.log(FUNCTIONS_NAME);
format(day);
