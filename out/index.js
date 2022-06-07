import { formatDate as format } from "utils/format_data";
// import { FUNCTIONS_NAME } from "@func"; //вопрос по export
import { FUNCTIONS_NAME } from "./utils/functions/functions";
import { getWorkers } from "./components";
// import { TEST } from "last/last";
// import { User } from "ppp/user";
// import { APELSIN } from "@/card";
// import CAT from "@cat/cat";
// import CAT, { DOG } from "~/components/cat/cat";
// console.log(DOG);
getWorkers();
const day = new Date();
console.log(FUNCTIONS_NAME);
format(day);
