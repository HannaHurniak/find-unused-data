import { currentMoment, DAY } from '../../constants/constants';
import { formatDate } from '../../utils/format_data';
import getNumber from './number';
import { CARDS } from './card';

const setNewDay = () => `You changed name of day. Now is ${DAY}`;
setNewDay();
getNumber();
const findRightNumber = () => {
    return CARDS.filter(el => el.card === 2);
}
findRightNumber();
